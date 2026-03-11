import { Request, Response } from 'express';
import Unit from './model';
import logger from '../../utils/logger';

export const getAllUnits = async (req: Request, res: Response) => {
  try {
    const units = await Unit.find({ tenantId: req.tenantId });
    res.json({ success: true, units });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener unidades', error: err.message });
  }
};

export const getUnitById = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!unit) return res.status(404).json({ success: false, message: 'Unidad no encontrada' });
    res.json({ success: true, unit });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener unidad', error: err.message });
  }
};

export const createUnit = async (req: Request, res: Response) => {
  try {
    const unit = new Unit({ ...req.body, tenantId: req.tenantId });
    await unit.save();
    logger.log('units.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { unitId: String(unit._id), code: unit.code });
    res.status(201).json({ success: true, unit });
  } catch (err: any) {
    logger.error('units.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear unidad', error: err.message });
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true }
    );

    if (!unit) return res.status(404).json({ success: false, message: 'Unidad no encontrada' });
    logger.log('units.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { unitId: req.params.id });
    res.json({ success: true, unit });
  } catch (err: any) {
    logger.error('units.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar unidad', error: err.message });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!unit) return res.status(404).json({ success: false, message: 'Unidad no encontrada' });
    logger.log('units.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { unitId: req.params.id });
    res.json({ success: true, message: 'Unidad eliminada' });
  } catch (err: any) {
    logger.error('units.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar unidad', error: err.message });
  }
};
