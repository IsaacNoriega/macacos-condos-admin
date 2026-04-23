import { Router } from 'express';
import { body, param } from 'express-validator';
import { createAmenity, deleteAmenity, getAllAmenities, updateAmenity } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), getAllAmenities);
router.post(
  '/',
  roleMiddleware(['superadmin', 'admin']),
  body('name').notEmpty().withMessage('Nombre de amenidad obligatorio'),
  body('maxDailyHours').isInt({ min: 1 }).withMessage('El límite máximo de horas diarias es obligatorio y debe ser mayor a 0'),
  validateRequest,
  createAmenity
);
router.put(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('name').optional().notEmpty().withMessage('Nombre de amenidad obligatorio'),
  validateRequest,
  updateAmenity
);
router.delete(
  '/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  deleteAmenity
);

export default router;
