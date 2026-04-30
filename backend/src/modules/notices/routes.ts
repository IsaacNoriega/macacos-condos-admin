import { Router } from 'express';
import * as controller from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

router.get('/', controller.getNotices);

// Only admin/superadmin can manage notices
router.post('/', roleMiddleware(['superadmin', 'admin']), controller.createNotice);
router.put('/:id', roleMiddleware(['superadmin', 'admin']), controller.updateNotice);
router.delete('/:id', roleMiddleware(['superadmin', 'admin']), controller.deleteNotice);

export default router;
