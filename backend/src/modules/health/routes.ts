import { Router } from 'express';
import { checkHealth } from './controller';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check del sistema para monitoreo de disponibilidad (RNF-DISP-001)
 * @access  Public (No requiere autenticación para que los balanceadores externos puedan sondear)
 */
router.get('/', checkHealth);

export default router;
