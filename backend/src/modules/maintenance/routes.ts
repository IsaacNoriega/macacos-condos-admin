import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllReports, createReport, updateReport, deleteReport } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']), getAllReports);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  body('description').notEmpty().withMessage('Descripción obligatoria'),
  validateRequest,
  createReport
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('status').optional().isIn(['pendiente', 'en progreso', 'resuelto']).withMessage('Estado inválido'),
  validateRequest,
  updateReport
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  validateRequest,
  deleteReport
);

export default router;
