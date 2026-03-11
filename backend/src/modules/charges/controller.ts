import { Request, Response } from 'express';
import Charge from './model';
import logger from '../../utils/logger';

export const getAllCharges = async (req: Request, res: Response) => {
  try {
    const charges = await Charge.find({ tenantId: req.tenantId });
    res.json({ success: true, charges });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener cargos', error: err.message });
  }
};

export const createCharge = async (req: Request, res: Response) => {
  try {
    const charge = new Charge({ ...req.body, tenantId: req.tenantId });
    await charge.save();
    logger.log('charges.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { chargeId: String(charge._id) });
    res.status(201).json({ success: true, charge });
  } catch (err: any) {
    logger.error('charges.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear cargo', error: err.message });
  }
};

export const updateCharge = async (req: Request, res: Response) => {
  try {
    const charge = await Charge.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!charge) return res.status(404).json({ success: false, message: 'Cargo no encontrado' });
    logger.log('charges.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { chargeId: req.params.id });
    res.json({ success: true, charge });
  } catch (err: any) {
    logger.error('charges.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar cargo', error: err.message });
  }
};

export const deleteCharge = async (req: Request, res: Response) => {
  try {
    const charge = await Charge.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!charge) return res.status(404).json({ success: false, message: 'Cargo no encontrado' });
    logger.log('charges.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { chargeId: req.params.id });
    res.json({ success: true, message: 'Cargo eliminado' });
  } catch (err: any) {
    logger.error('charges.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar cargo', error: err.message });
  }
};
