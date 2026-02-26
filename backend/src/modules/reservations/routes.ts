import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllReservations, createReservation, updateReservation, deleteReservation } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin']), getAllReservations);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  body('amenity').notEmpty().withMessage('Amenidad obligatoria'),
  body('start').isISO8601().withMessage('Fecha de inicio inválida'),
  body('end').isISO8601().withMessage('Fecha de fin inválida'),
  createReservation
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('status').optional().isIn(['activa', 'cancelada']).withMessage('Estado inválido'),
  updateReservation
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  deleteReservation
);

export default router;
