import { NextFunction, Request, Response } from 'express';
import Tenant from './model';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';

export const getAllTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await Tenant.find();
    res.json({ success: true, tenants });
  } catch (err: unknown) {
    next(new AppError('Error al obtener tenants', 500, { cause: toError(err).message }));
  }
};

export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    res.json({ success: true, tenant });
  } catch (err: unknown) {
    next(err instanceof AppError ? err : new AppError('Error al obtener tenant', 500, { cause: toError(err).message }));
  }
};

export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = new Tenant(req.body);
    await tenant.save();
    logger.log('tenants.create', req.user?.id ? String(req.user.id) : 'system', String(tenant._id), { name: tenant.name });
    res.status(201).json({ success: true, tenant });
  } catch (err: unknown) {
    logger.error('tenants.create.error', req.user?.id ? String(req.user.id) : 'system', 'global', toError(err));
    next(new AppError('Error al crear tenant', 400, { cause: toError(err).message }));
  }
};

export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    logger.log('tenants.update', req.user?.id ? String(req.user.id) : 'system', String(tenant._id), { tenantId: req.params.id });
    res.json({ success: true, tenant });
  } catch (err: unknown) {
    logger.error('tenants.update.error', req.user?.id ? String(req.user.id) : 'system', String(req.params.id), toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar tenant', 400, { cause: toError(err).message }));
  }
};

export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    logger.log('tenants.delete', req.user?.id ? String(req.user.id) : 'system', String(tenant._id), { tenantId: req.params.id });
    res.json({ success: true, message: 'Tenant eliminado' });
  } catch (err: unknown) {
    logger.error('tenants.delete.error', req.user?.id ? String(req.user.id) : 'system', String(req.params.id), toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar tenant', 400, { cause: toError(err).message }));
  }
};
