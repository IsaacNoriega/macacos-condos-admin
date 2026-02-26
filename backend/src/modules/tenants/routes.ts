import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllTenants, getTenantById, createTenant, updateTenant, deleteTenant } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/', roleMiddleware(['superadmin']), getAllTenants);
router.get('/:id', roleMiddleware(['superadmin']), param('id').isMongoId().withMessage('ID inválido'), getTenantById);
router.post('/',
  roleMiddleware(['superadmin']),
  body('name').notEmpty().withMessage('El nombre es obligatorio'),
  body('address').notEmpty().withMessage('La dirección es obligatoria'),
  body('contactEmail').isEmail().withMessage('Email de contacto inválido'),
  createTenant
);
router.put('/:id',
  roleMiddleware(['superadmin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('name').optional().notEmpty().withMessage('El nombre es obligatorio'),
  body('address').optional().notEmpty().withMessage('La dirección es obligatoria'),
  body('contactEmail').optional().isEmail().withMessage('Email de contacto inválido'),
  updateTenant
);
router.delete('/:id', roleMiddleware(['superadmin']), param('id').isMongoId().withMessage('ID inválido'), deleteTenant);

export default router;
