import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllPayments, createPayment, updatePayment, deletePayment } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin']), getAllPayments);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  body('userId').isMongoId().withMessage('userId inválido'),
  body('chargeId').isMongoId().withMessage('chargeId inválido'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  createPayment
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('amount').optional().isNumeric().withMessage('Monto inválido'),
  updatePayment
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  deletePayment
);

export default router;
