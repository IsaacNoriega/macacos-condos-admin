import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllCharges, createCharge, updateCharge, deleteCharge } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin']), getAllCharges);
router.post('/',
  roleMiddleware(['superadmin', 'admin']),
  body('userId').isMongoId().withMessage('userId inválido'),
  body('description').notEmpty().withMessage('Descripción obligatoria'),
  body('amount').isNumeric().withMessage('Monto inválido'),
  body('dueDate').isISO8601().withMessage('Fecha de vencimiento inválida'),
  createCharge
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('description').optional().notEmpty().withMessage('Descripción obligatoria'),
  body('amount').optional().isNumeric().withMessage('Monto inválido'),
  body('dueDate').optional().isISO8601().withMessage('Fecha de vencimiento inválida'),
  updateCharge
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  deleteCharge
);

export default router;
