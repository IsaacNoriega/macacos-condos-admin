import { NextFunction, Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import {
  confirmStripeCheckoutSession,
  createPayment,
  createStripeCheckoutSession,
  deletePayment,
  getAllPayments,
  getPaymentProof,
  updatePayment,
  approvePaymentWithProof,
  rejectPaymentWithProof,
  uploadPaymentProof,
} from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// Wrap multer so its errors (e.g. LIMIT_FILE_SIZE on files over 10 MB)
// surface as 4xx validation errors instead of falling through to the
// global handler and being reported as 500s.
const uploadProofFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'El comprobante supera el tamaño máximo permitido (10 MB)'
          : `No se pudo procesar el archivo: ${err.message}`;
      return res.status(400).json({ success: false, message });
    }
    if (err) {
      return next(err);
    }
    return next();
  });
};

router.get('/', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), getAllPayments);
router.get('/:id/proof', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), param('id').isMongoId().withMessage('ID inválido'), validateRequest, getPaymentProof);
router.post('/proofs', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), uploadProofFile, uploadPaymentProof);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  body('userId').isMongoId().withMessage('userId inválido'),
  body('chargeId').isMongoId().withMessage('chargeId inválido'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  body('provider').optional().isIn(['manual', 'stripe']).withMessage('Proveedor inválido'),
  validateRequest,
  createPayment
);
router.post(
  '/checkout-session',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  body('userId').isMongoId().withMessage('userId inválido'),
  body('chargeId').isMongoId().withMessage('chargeId inválido'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  validateRequest,
  createStripeCheckoutSession
);
router.post(
  '/checkout-session/:sessionId/confirm',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  param('sessionId').isString().notEmpty().withMessage('sessionId inválido'),
  validateRequest,
  confirmStripeCheckoutSession
);
router.post(
  '/:id/approve',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  approvePaymentWithProof
);
router.post(
  '/:id/reject',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  rejectPaymentWithProof
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('amount').optional().isNumeric().withMessage('Monto inválido'),
  validateRequest,
  updatePayment
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  deletePayment
);

export default router;
