import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as maintenanceService from './service';

export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    let reports;

    if (req.user?.role === 'superadmin') {
      reports = queryTenantId
        ? await maintenanceService.findMaintenanceByTenant(String(queryTenantId))
        : await maintenanceService.findAllMaintenance();
    } else if (req.user?.role === 'residente' || req.user?.role === 'familiar') {
      reports = await maintenanceService.findMaintenanceByUser(req.tenantId, String(req.user?.id));
    } else {
      reports = await maintenanceService.findMaintenanceByTenant(req.tenantId);
    }

    res.json({ success: true, reports });
  } catch (err: unknown) {
    next(new AppError('Error al obtener reportes', 500, { cause: toError(err).message }));
  }
};

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: requestedTenantId, userId: requestedUserId, ...payload } = req.body;
    const targetTenantId = req.user?.role === 'superadmin'
      ? (requestedTenantId ? String(requestedTenantId) : '')
      : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    const targetUserId = req.user?.role === 'residente' || req.user?.role === 'familiar'
      ? String(req.user.id)
      : (requestedUserId ? String(requestedUserId) : String(req.user?.id || ''));

    const report = await maintenanceService.createMaintenanceInTenant({ ...payload, userId: targetUserId }, targetTenantId);
    logger.log('maintenance.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { reportId: String(report._id) });
    res.status(201).json({ success: true, report });
  } catch (err: unknown) {
    logger.error('maintenance.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear reporte', 400, { cause: toError(err).message }));
  }
};

export const updateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await maintenanceService.updateMaintenanceInTenant(String(req.params.id), req.tenantId, req.body);
    if (!report) {
      throw new AppError('Reporte no encontrado', 404);
    }

    logger.log('maintenance.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reportId: req.params.id });
    res.json({ success: true, report });
  } catch (err: unknown) {
    logger.error('maintenance.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar reporte', 400, { cause: toError(err).message }));
  }
};

export const deleteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await maintenanceService.deleteMaintenanceInTenant(String(req.params.id), req.tenantId);
    if (!report) {
      throw new AppError('Reporte no encontrado', 404);
    }

    logger.log('maintenance.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reportId: req.params.id });
    res.json({ success: true, message: 'Reporte eliminado' });
  } catch (err: unknown) {
    logger.error('maintenance.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar reporte', 400, { cause: toError(err).message }));
  }
};
