import { Router } from 'express';
import { getDashboardStats } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/dashboard', roleMiddleware(['admin', 'superadmin']), getDashboardStats);

export default router;
