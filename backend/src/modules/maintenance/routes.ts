import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllReports, createReport, updateReport, deleteReport } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/', roleMiddleware(['superadmin', 'admin']), getAllReports);
router.post('/',
  roleMiddleware(['superadmin', 'admin', 'residente']),
  body('description').notEmpty().withMessage('Descripción obligatoria'),
  createReport
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('status').optional().isIn(['pendiente', 'en progreso', 'resuelto']).withMessage('Estado inválido'),
  updateReport
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  deleteReport
);

export default router;
