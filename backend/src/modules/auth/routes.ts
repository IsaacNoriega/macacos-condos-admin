import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, forgotPassword, resetPassword } from './controller';
import validateRequest from '../../middleware/validateRequest';

const router = Router();

// Registro de usuario
router.post(
	'/register',
	body('name').notEmpty().withMessage('El nombre es obligatorio'),
	body('email').isEmail().withMessage('Email invalido'),
	body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
	body('role').isIn(['superadmin', 'admin', 'residente', 'familiar']).withMessage('Rol invalido'),
	body('tenantId').isMongoId().withMessage('tenantId invalido'),
	validateRequest,
	register
);
// Login
router.post(
	'/login',
	body('email').isEmail().withMessage('Email invalido'),
	body('password').notEmpty().withMessage('La contraseña es obligatoria'),
	validateRequest,
	login
);
// Recuperación de contraseña
router.post(
	'/forgot-password',
	body('tenantId').isMongoId().withMessage('tenantId invalido'),
	body('email').isEmail().withMessage('Email invalido'),
	validateRequest,
	forgotPassword
);

router.post(
	'/reset-password',
	body('token').isString().notEmpty().withMessage('Token obligatorio'),
	body('newPassword').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
	validateRequest,
	resetPassword
);

export default router;
