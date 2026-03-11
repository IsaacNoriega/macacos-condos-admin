import { Request, Response } from 'express';
import Resident from './model';
import Unit from '../units/model';
import logger from '../../utils/logger';

const MAX_RESIDENTS_PER_UNIT = 5;

const validateUnitInTenant = async (unitId: string, tenantId?: string) => {
  if (!tenantId) return false;
  const unit = await Unit.findOne({ _id: unitId, tenantId });
  return Boolean(unit);
};

export const getAllResidents = async (req: Request, res: Response) => {
  try {
    const residents = await Resident.find({ tenantId: req.tenantId });
    res.json({ success: true, residents });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener residentes', error: err.message });
  }
};

export const getResidentById = async (req: Request, res: Response) => {
  try {
    const resident = await Resident.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resident) return res.status(404).json({ success: false, message: 'Residente no encontrado' });
    res.json({ success: true, resident });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener residente', error: err.message });
  }
};

export const createResident = async (req: Request, res: Response) => {
  try {
    const { unitId } = req.body;

    const validUnit = await validateUnitInTenant(unitId, req.tenantId);
    if (!validUnit) {
      return res.status(400).json({ success: false, message: 'La unidad no pertenece al tenant actual' });
    }

    const currentResidents = await Resident.countDocuments({ tenantId: req.tenantId, unitId });
    if (currentResidents >= MAX_RESIDENTS_PER_UNIT) {
      return res.status(400).json({
        success: false,
        message: `La unidad ya tiene el maximo permitido de ${MAX_RESIDENTS_PER_UNIT} residentes`,
      });
    }

    const resident = new Resident({ ...req.body, tenantId: req.tenantId });
    await resident.save();
    logger.log('residents.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: String(resident._id), unitId });
    res.status(201).json({ success: true, resident });
  } catch (err: any) {
    logger.error('residents.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear residente', error: err.message });
  }
};

export const updateResident = async (req: Request, res: Response) => {
  try {
    const currentResident = await Resident.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!currentResident) return res.status(404).json({ success: false, message: 'Residente no encontrado' });

    if (req.body.unitId && req.body.unitId !== currentResident.unitId.toString()) {
      const validUnit = await validateUnitInTenant(req.body.unitId, req.tenantId);
      if (!validUnit) {
        return res.status(400).json({ success: false, message: 'La unidad no pertenece al tenant actual' });
      }

      const residentsInTargetUnit = await Resident.countDocuments({
        tenantId: req.tenantId,
        unitId: req.body.unitId,
      });

      if (residentsInTargetUnit >= MAX_RESIDENTS_PER_UNIT) {
        return res.status(400).json({
          success: false,
          message: `La unidad destino ya tiene ${MAX_RESIDENTS_PER_UNIT} residentes`,
        });
      }
    }

    const resident = await Resident.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true }
    );

    logger.log('residents.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: req.params.id });
    res.json({ success: true, resident });
  } catch (err: any) {
    logger.error('residents.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar residente', error: err.message });
  }
};

export const deleteResident = async (req: Request, res: Response) => {
  try {
    const resident = await Resident.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!resident) return res.status(404).json({ success: false, message: 'Residente no encontrado' });
    logger.log('residents.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: req.params.id });
    res.json({ success: true, message: 'Residente eliminado' });
  } catch (err: any) {
    logger.error('residents.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar residente', error: err.message });
  }
};
