import { Request, Response } from 'express';
import Tenant from './model';
import logger from '../../utils/logger';

export const getAllTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find();
    res.json({ success: true, tenants });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener tenants', error: err.message });
  }
};

export const getTenantById = async (req: Request, res: Response) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    res.json({ success: true, tenant });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener tenant', error: err.message });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const tenant = new Tenant(req.body);
    await tenant.save();
    logger.log('tenants.create', req.user?.id ? String(req.user.id) : 'system', String(tenant._id), { name: tenant.name });
    res.status(201).json({ success: true, tenant });
  } catch (err: any) {
    logger.error('tenants.create.error', req.user?.id ? String(req.user.id) : 'system', 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear tenant', error: err.message });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    logger.log('tenants.update', req.user?.id ? String(req.user.id) : 'system', String(tenant._id), { tenantId: req.params.id });
    res.json({ success: true, tenant });
  } catch (err: any) {
    logger.error('tenants.update.error', req.user?.id ? String(req.user.id) : 'system', String(req.params.id), err);
    res.status(400).json({ success: false, message: 'Error al actualizar tenant', error: err.message });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
    logger.log('tenants.delete', req.user?.id ? String(req.user.id) : 'system', String(tenant._id), { tenantId: req.params.id });
    res.json({ success: true, message: 'Tenant eliminado' });
  } catch (err: any) {
    logger.error('tenants.delete.error', req.user?.id ? String(req.user.id) : 'system', String(req.params.id), err);
    res.status(400).json({ success: false, message: 'Error al eliminar tenant', error: err.message });
  }
};
