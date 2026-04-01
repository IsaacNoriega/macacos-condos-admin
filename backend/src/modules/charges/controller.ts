import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as chargesService from './service';

export const getAllCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    let charges;

    if (req.user?.role === 'superadmin') {
      charges = queryTenantId
        ? await chargesService.findChargesByTenant(String(queryTenantId))
        : await chargesService.findAllCharges();
    } else if (req.user?.role === 'residente' || req.user?.role === 'familiar') {
      const tenantCharges = await chargesService.findChargesByTenant(req.tenantId);
      charges = tenantCharges.filter((charge) => String(charge.userId) === String(req.user?.id));
    } else {
      charges = await chargesService.findChargesByTenant(req.tenantId);
    }

    res.json({ success: true, charges });
  } catch (err: unknown) {
    next(new AppError('Error al obtener cargos', 500, { cause: toError(err).message }));
  }
};

export const createCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: requestedTenantId, ...payload } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    const charge = await chargesService.createChargeInTenant(payload, targetTenantId);
    logger.log('charges.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { chargeId: String(charge._id) });
    res.status(201).json({ success: true, charge });
  } catch (err: unknown) {
    logger.error('charges.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear cargo', 400, { cause: toError(err).message }));
  }
};

export const updateCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.role === 'superadmin' && req.body?.tenantId ? String(req.body.tenantId) : req.tenantId;
    const { tenantId: _ignoredTenantId, ...payload } = req.body;
    const charge = await chargesService.updateChargeInTenant(String(req.params.id), tenantId, payload);
    if (!charge) {
      throw new AppError('Cargo no encontrado', 404);
    }

    logger.log('charges.update', req.user?.id ? String(req.user.id) : 'system', tenantId || 'global', { chargeId: req.params.id });
    res.json({ success: true, charge });
  } catch (err: unknown) {
    logger.error('charges.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar cargo', 400, { cause: toError(err).message }));
  }
};

export const deleteCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.role === 'superadmin' && req.query?.tenantId ? String(req.query.tenantId) : req.tenantId;
    const charge = await chargesService.deleteChargeInTenant(String(req.params.id), tenantId);
    if (!charge) {
      throw new AppError('Cargo no encontrado', 404);
    }

    logger.log('charges.delete', req.user?.id ? String(req.user.id) : 'system', tenantId || 'global', { chargeId: req.params.id });
    res.json({ success: true, message: 'Cargo eliminado' });
  } catch (err: unknown) {
    logger.error('charges.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar cargo', 400, { cause: toError(err).message }));
  }
};
