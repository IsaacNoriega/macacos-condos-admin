import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import {
  createUserInTenant,
  deleteUserInTenant,
  findUserByIdInTenant,
  findUsersByTenant,
  updateUserInTenant,
} from './service';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    let queryTenantId_final = req.tenantId;

    if (req.user?.role === 'superadmin' && queryTenantId) {
      queryTenantId_final = String(queryTenantId);
    }

    const users = await findUsersByTenant(queryTenantId_final);
    res.json({ success: true, users });
  } catch (err: unknown) {
    next(new AppError('Error al obtener usuarios', 500, { cause: toError(err).message }));
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await findUserByIdInTenant(String(req.params.id), req.tenantId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json({ success: true, user });
  } catch (err: unknown) {
    next(err instanceof AppError ? err : new AppError('Error al obtener usuario', 500, { cause: toError(err).message }));
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, tenantId: requestedTenantId, ...rest } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUserInTenant({ ...rest, password: hashedPassword }, targetTenantId);
    logger.log('users.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { userId: String(user._id), role: user.role });
    res.status(201).json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (err: unknown) {
    logger.error('users.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear usuario', 400, { cause: toError(err).message }));
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const update: Record<string, unknown> = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(String(update.password), 10);
    }
    const user = await updateUserInTenant(String(req.params.id), req.tenantId, update);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    logger.log('users.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { targetUserId: req.params.id });
    res.json({ success: true, user });
  } catch (err: unknown) {
    logger.error('users.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar usuario', 400, { cause: toError(err).message }));
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await deleteUserInTenant(String(req.params.id), req.tenantId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    logger.log('users.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { targetUserId: req.params.id });
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (err: unknown) {
    logger.error('users.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar usuario', 400, { cause: toError(err).message }));
  }
};
