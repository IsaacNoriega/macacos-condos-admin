import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createPayment,
  createStripeCheckoutSession,
  deletePayment,
  getAllPayments,
  updatePayment,
} from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin']), getAllPayments);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  body('userId').isMongoId().withMessage('userId inválido'),
  body('chargeId').isMongoId().withMessage('chargeId inválido'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  validateRequest,
  createPayment
);
router.post(
  '/checkout-session',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  body('userId').isMongoId().withMessage('userId inválido'),
  body('chargeId').isMongoId().withMessage('chargeId inválido'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  validateRequest,
  createStripeCheckoutSession
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
