import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllCharges, createCharge, updateCharge, deleteCharge } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), getAllCharges);
router.post('/',
  roleMiddleware(['superadmin', 'admin']),
  body('userId').optional({ checkFalsy: true }).isMongoId().withMessage('userId inválido'),
  body('unitId').optional().isMongoId().withMessage('unitId inválido'),
  body('description').notEmpty().withMessage('Descripción obligatoria'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  body('dueDate').isISO8601().withMessage('Fecha de vencimiento inválida'),
  body('lateFeePerDay').optional().isNumeric().withMessage('Recargo diario inválido'),
  validateRequest,
  createCharge
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('userId').optional({ checkFalsy: true }).isMongoId().withMessage('userId inválido'),
  body('unitId').optional().isMongoId().withMessage('unitId inválido'),
  body('description').optional().notEmpty().withMessage('Descripción obligatoria'),
  body('amount').optional().isNumeric().withMessage('Monto inválido'),
  body('dueDate').optional().isISO8601().withMessage('Fecha de vencimiento inválida'),
  body('lateFeePerDay').optional().isNumeric().withMessage('Recargo diario inválido'),
  validateRequest,
  updateCharge
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  deleteCharge
);

export default router;
