import { Router } from 'express';
import { register, login, forgotPassword } from './controller';

const router = Router();

// Registro de usuario
router.post('/register', register);
// Login
router.post('/login', login);
// Recuperación de contraseña
router.post('/forgot-password', forgotPassword);

export default router;
