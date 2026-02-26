import { Router } from 'express';
import { body, param } from 'express-validator';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from './controller';
import roleMiddleware from '../../middleware/roleMiddleware';

const router = Router();

// Todas las rutas protegidas por middlewares en app.js
router.get('/', roleMiddleware(['superadmin', 'admin']), getAllUsers);
router.get('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  getUserById
);
router.post('/',
  roleMiddleware(['superadmin', 'admin']),
  body('name').notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role').isIn(['superadmin', 'admin', 'residente']).withMessage('Rol inválido'),
  createUser
);
router.put('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  body('name').optional().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role').optional().isIn(['superadmin', 'admin', 'residente']).withMessage('Rol inválido'),
  updateUser
);
router.delete('/:id',
  roleMiddleware(['superadmin', 'admin']),
  param('id').isMongoId().withMessage('ID inválido'),
  deleteUser
);

export default router;
