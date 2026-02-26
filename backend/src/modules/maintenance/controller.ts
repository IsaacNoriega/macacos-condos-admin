import { Request, Response } from 'express';
import Maintenance from './model';

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
    res.status(201).json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Error al crear reporte', error: err.message });
  }
};

export const updateReport = async (req: Request, res: Response) => {
  try {
    const report = await Maintenance.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!report) return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Error al actualizar reporte', error: err.message });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const report = await Maintenance.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!report) return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    res.json({ success: true, message: 'Reporte eliminado' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Error al eliminar reporte', error: err.message });
  }
};
