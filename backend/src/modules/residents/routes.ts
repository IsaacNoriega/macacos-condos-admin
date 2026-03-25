import { Router } from 'express';
import { body, param } from 'express-validator';
import { createResident, deleteResident, getAllResidents, getResidentById, updateResident } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin']), getAllResidents);
router.get(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID invalido'),
  validateRequest,
  getResidentById
);
router.post(
  '/',
  roleMiddleware(['superadmin', 'admin']),
  body('unitId').isMongoId().withMessage('unitId invalido'),
  body('name').notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email invalido'),
  body('relationship').isIn(['propietario', 'familiar', 'inquilino']).withMessage('Relacion invalida'),
  validateRequest,
  createResident
);
router.put(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID invalido'),
  body('unitId').optional().isMongoId().withMessage('unitId invalido'),
  body('name').optional().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').optional().isEmail().withMessage('Email invalido'),
  body('relationship').optional().isIn(['propietario', 'familiar', 'inquilino']).withMessage('Relacion invalida'),
  validateRequest,
  updateResident
);
router.delete(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID invalido'),
  validateRequest,
  deleteResident
);

export default router;
