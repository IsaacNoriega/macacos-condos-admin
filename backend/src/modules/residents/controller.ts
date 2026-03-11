import { NextFunction, Request, Response } from 'express';
import Resident from './model';
import Unit from '../units/model';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';

const MAX_RESIDENTS_PER_UNIT = 5;

const validateUnitInTenant = async (unitId: string, tenantId?: string) => {
  if (!tenantId) return false;
  const unit = await Unit.findOne({ _id: unitId, tenantId });
  return Boolean(unit);
};

export const getAllResidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const residents = await Resident.find({ tenantId: req.tenantId });
    res.json({ success: true, residents });
  } catch (err: unknown) {
    next(new AppError('Error al obtener residentes', 500, { cause: toError(err).message }));
  }
};

export const getResidentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resident = await Resident.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resident) {
      throw new AppError('Residente no encontrado', 404);
    }

    res.json({ success: true, resident });
  } catch (err: unknown) {
    next(err instanceof AppError ? err : new AppError('Error al obtener residente', 500, { cause: toError(err).message }));
  }
};

export const createResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { unitId } = req.body;

    const validUnit = await validateUnitInTenant(unitId, req.tenantId);
    if (!validUnit) {
      throw new AppError('La unidad no pertenece al tenant actual', 400);
    }

    const currentResidents = await Resident.countDocuments({ tenantId: req.tenantId, unitId });
    if (currentResidents >= MAX_RESIDENTS_PER_UNIT) {
      throw new AppError(`La unidad ya tiene el maximo permitido de ${MAX_RESIDENTS_PER_UNIT} residentes`, 400);
    }

    const resident = new Resident({ ...req.body, tenantId: req.tenantId });
    await resident.save();
    logger.log('residents.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: String(resident._id), unitId });
    res.status(201).json({ success: true, resident });
  } catch (err: unknown) {
    logger.error('residents.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al crear residente', 400, { cause: toError(err).message }));
  }
};

export const updateResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentResident = await Resident.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!currentResident) {
      throw new AppError('Residente no encontrado', 404);
    }

    if (req.body.unitId && req.body.unitId !== currentResident.unitId.toString()) {
      const validUnit = await validateUnitInTenant(req.body.unitId, req.tenantId);
      if (!validUnit) {
        throw new AppError('La unidad no pertenece al tenant actual', 400);
      }

      const residentsInTargetUnit = await Resident.countDocuments({
        tenantId: req.tenantId,
        unitId: req.body.unitId,
      });

      if (residentsInTargetUnit >= MAX_RESIDENTS_PER_UNIT) {
        throw new AppError(`La unidad destino ya tiene ${MAX_RESIDENTS_PER_UNIT} residentes`, 400);
      }
    }

    const resident = await Resident.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true }
    );

    logger.log('residents.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: req.params.id });
    res.json({ success: true, resident });
  } catch (err: unknown) {
    logger.error('residents.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar residente', 400, { cause: toError(err).message }));
  }
};

export const deleteResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resident = await Resident.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!resident) {
      throw new AppError('Residente no encontrado', 404);
    }

    logger.log('residents.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: req.params.id });
    res.json({ success: true, message: 'Residente eliminado' });
  } catch (err: unknown) {
    logger.error('residents.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar residente', 400, { cause: toError(err).message }));
  }
};
