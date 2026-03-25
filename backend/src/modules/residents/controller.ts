import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as residentsService from './service';

const MAX_RESIDENTS_PER_UNIT = 5;

export const getAllResidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const residents = await residentsService.findResidentsByTenant(req.tenantId);
    res.json({ success: true, residents });
  } catch (err: unknown) {
    next(new AppError('Error al obtener residentes', 500, { cause: toError(err).message }));
  }
};

export const getResidentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resident = await residentsService.findResidentByIdInTenant(String(req.params.id), req.tenantId);
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

    const validUnit = await residentsService.validateUnitInTenant(unitId, req.tenantId);
    if (!validUnit) {
      throw new AppError('La unidad no pertenece al tenant actual', 400);
    }

    const currentResidents = await residentsService.countResidentsInUnit(req.tenantId, unitId);
    if (currentResidents >= MAX_RESIDENTS_PER_UNIT) {
      throw new AppError(`La unidad ya tiene el maximo permitido de ${MAX_RESIDENTS_PER_UNIT} residentes`, 400);
    }

    const resident = await residentsService.createResidentInTenant(req.body, req.tenantId);
    logger.log('residents.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: String(resident._id), unitId });
    res.status(201).json({ success: true, resident });
  } catch (err: unknown) {
    logger.error('residents.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al crear residente', 400, { cause: toError(err).message }));
  }
};

export const updateResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentResident = await residentsService.findResidentByIdInTenant(String(req.params.id), req.tenantId);
    if (!currentResident) {
      throw new AppError('Residente no encontrado', 404);
    }

    if (req.body.unitId && req.body.unitId !== currentResident.unitId.toString()) {
      const validUnit = await residentsService.validateUnitInTenant(req.body.unitId, req.tenantId);
      if (!validUnit) {
        throw new AppError('La unidad no pertenece al tenant actual', 400);
      }

      const residentsInTargetUnit = await residentsService.countResidentsInUnit(req.tenantId, req.body.unitId);

      if (residentsInTargetUnit >= MAX_RESIDENTS_PER_UNIT) {
        throw new AppError(`La unidad destino ya tiene ${MAX_RESIDENTS_PER_UNIT} residentes`, 400);
      }
    }

    const resident = await residentsService.updateResidentInTenant(String(req.params.id), req.tenantId, req.body);

    logger.log('residents.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { residentId: req.params.id });
    res.json({ success: true, resident });
  } catch (err: unknown) {
    logger.error('residents.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar residente', 400, { cause: toError(err).message }));
  }
};

export const deleteResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resident = await residentsService.deleteResidentInTenant(String(req.params.id), req.tenantId);
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
