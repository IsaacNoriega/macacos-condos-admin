import { Router } from 'express';
import { getDashboardStats } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

// Endpoint de alto rendimiento con Cache-Aside
router.get('/dashboard', roleMiddleware(['admin', 'superadmin']), getDashboardStats);

export default router;
