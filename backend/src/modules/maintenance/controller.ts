import { NextFunction, Request, Response } from 'express';
import Maintenance from './model';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';

export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await Maintenance.find({ tenantId: req.tenantId });
    res.json({ success: true, reports });
  } catch (err: unknown) {
    next(new AppError('Error al obtener reportes', 500, { cause: toError(err).message }));
  }
};

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = new Maintenance({ ...req.body, tenantId: req.tenantId });
    await report.save();
    logger.log('maintenance.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reportId: String(report._id) });
    res.status(201).json({ success: true, report });
  } catch (err: unknown) {
    logger.error('maintenance.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear reporte', 400, { cause: toError(err).message }));
  }
};

export const updateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Maintenance.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
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
    const report = await Maintenance.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
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
