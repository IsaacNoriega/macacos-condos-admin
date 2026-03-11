import { Router } from 'express';
import { body, param } from 'express-validator';
import { createUnit, deleteUnit, getAllUnits, getUnitById, updateUnit } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin', 'residente']), getAllUnits);
router.get(
  '/:id',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  param('id').isMongoId().withMessage('ID invalido'),
  validateRequest,
  getUnitById
);
router.post(
  '/',
  roleMiddleware(['superadmin', 'admin']),
  body('code').notEmpty().withMessage('El codigo de unidad es obligatorio'),
  body('type').isIn(['departamento', 'casa']).withMessage('Tipo de unidad invalido'),
  validateRequest,
  createUnit
);
router.put(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID invalido'),
  body('code').optional().notEmpty().withMessage('El codigo de unidad es obligatorio'),
  body('type').optional().isIn(['departamento', 'casa']).withMessage('Tipo de unidad invalido'),
  validateRequest,
  updateUnit
);
router.delete(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID invalido'),
  validateRequest,
  deleteUnit
);

export default router;
