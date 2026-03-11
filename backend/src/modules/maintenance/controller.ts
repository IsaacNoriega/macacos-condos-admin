import { Request, Response } from 'express';
import Maintenance from './model';
import logger from '../../utils/logger';

export const getAllReports = async (req: Request, res: Response) => {
  try {
    const reports = await Maintenance.find({ tenantId: req.tenantId });
    res.json({ success: true, reports });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener reportes', error: err.message });
  }
};

export const createReport = async (req: Request, res: Response) => {
  try {
    const report = new Maintenance({ ...req.body, tenantId: req.tenantId });
    await report.save();
    logger.log('maintenance.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reportId: String(report._id) });
    res.status(201).json({ success: true, report });
  } catch (err: any) {
    logger.error('maintenance.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear reporte', error: err.message });
  }
};

export const updateReport = async (req: Request, res: Response) => {
  try {
    const report = await Maintenance.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!report) return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    logger.log('maintenance.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reportId: req.params.id });
    res.json({ success: true, report });
  } catch (err: any) {
    logger.error('maintenance.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar reporte', error: err.message });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const report = await Maintenance.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!report) return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    logger.log('maintenance.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reportId: req.params.id });
    res.json({ success: true, message: 'Reporte eliminado' });
  } catch (err: any) {
    logger.error('maintenance.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar reporte', error: err.message });
  }
};
