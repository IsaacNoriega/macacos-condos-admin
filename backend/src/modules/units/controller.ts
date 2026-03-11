import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as unitsService from './service';

export const getAllUnits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const units = await unitsService.findUnitsByTenant(req.tenantId);
    res.json({ success: true, units });
  } catch (err: unknown) {
    next(new AppError('Error al obtener unidades', 500, { cause: toError(err).message }));
  }
};

export const getUnitById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unit = await unitsService.findUnitByIdInTenant(String(req.params.id), req.tenantId);
    if (!unit) {
      throw new AppError('Unidad no encontrada', 404);
    }

    res.json({ success: true, unit });
  } catch (err: unknown) {
    next(err instanceof AppError ? err : new AppError('Error al obtener unidad', 500, { cause: toError(err).message }));
  }
};

export const createUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unit = await unitsService.createUnitInTenant(req.body, req.tenantId);
    logger.log('units.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { unitId: String(unit._id), code: unit.code });
    res.status(201).json({ success: true, unit });
  } catch (err: unknown) {
    logger.error('units.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear unidad', 400, { cause: toError(err).message }));
  }
};

export const updateUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unit = await unitsService.updateUnitInTenant(String(req.params.id), req.tenantId, req.body);

    if (!unit) {
      throw new AppError('Unidad no encontrada', 404);
    }

    logger.log('units.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { unitId: req.params.id });
    res.json({ success: true, unit });
  } catch (err: unknown) {
    logger.error('units.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar unidad', 400, { cause: toError(err).message }));
  }
};

export const deleteUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unit = await unitsService.deleteUnitInTenant(String(req.params.id), req.tenantId);
    if (!unit) {
      throw new AppError('Unidad no encontrada', 404);
    }

    logger.log('units.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { unitId: req.params.id });
    res.json({ success: true, message: 'Unidad eliminada' });
  } catch (err: unknown) {
    logger.error('units.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar unidad', 400, { cause: toError(err).message }));
  }
};
