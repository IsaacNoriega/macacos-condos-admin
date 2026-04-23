import { Router } from 'express';
import { body, param } from 'express-validator';
import { createNotice, getNoticesByTenant } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

// Solo superadmin puede crear avisos generales
router.post(
  '/',
  roleMiddleware(['superadmin']),
  body('tenantId').notEmpty().withMessage('Tenant obligatorio'),
  body('title').notEmpty().withMessage('Título obligatorio'),
  body('message').notEmpty().withMessage('Mensaje obligatorio'),
  validateRequest,
  createNotice
);

// Todos pueden consultar avisos de su tenant
router.get(
  '/:tenantId',
  roleMiddleware(['superadmin', 'admin', 'residente', 'familiar']),
  param('tenantId').notEmpty().withMessage('Tenant obligatorio'),
  validateRequest,
  getNoticesByTenant
);

export default router;
