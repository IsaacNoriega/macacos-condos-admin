import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllReservations, createReservation, updateReservation, deleteReservation } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), getAllReservations);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  body('amenity').notEmpty().withMessage('Amenidad obligatoria'),
  body('start').isISO8601().withMessage('Fecha de inicio inválida'),
  body('end').isISO8601().withMessage('Fecha de fin inválida'),
  body('end').custom((value, { req }) => {
    const start = new Date(req.body.start);
    const end = new Date(value);
    if (start >= end) {
      throw new Error('La fecha de inicio debe ser menor que la fecha de fin');
    }
    return true;
  }),
  validateRequest,
  createReservation
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('amenity').optional().notEmpty().withMessage('Amenidad inválida'),
  body('start').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('end').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('end').optional().custom((value, { req }) => {
    const start = req.body.start ? new Date(req.body.start) : undefined;
    const end = new Date(value);
    if (start && start >= end) {
      throw new Error('La fecha de inicio debe ser menor que la fecha de fin');
    }
    return true;
  }),
  body('status').optional().isIn(['activa', 'cancelada']).withMessage('Estado inválido'),
  validateRequest,
  updateReservation
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  deleteReservation
);

export default router;
