import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as residentsService from './service';
import { findUserByEmailInTenant } from '../users/service';

const MAX_RESIDENTS_PER_UNIT = 5;

const getAllowedRelationshipsByRole = (role: string): string[] => {
  if (role === 'familiar') {
    return ['familiar'];
  }

  if (role === 'residente') {
    return ['propietario', 'inquilino'];
  }

  return [];
};

const ensureLinkedResidentUser = async (email: string, tenantId: string) => {
  const linkedUser = await findUserByEmailInTenant(email, tenantId);
  if (!linkedUser) {
    throw new AppError('El email seleccionado no corresponde a un usuario del tenant', 400);
  }

  if (linkedUser.role !== 'residente' && linkedUser.role !== 'familiar') {
    throw new AppError('Solo se permiten usuarios con rol residente o familiar para residentes', 400);
  }

  return linkedUser;
};

const ensureRelationshipMatchesRole = (role: string, relationship: string) => {
  const allowed = getAllowedRelationshipsByRole(role);
  if (!allowed.includes(relationship)) {
    throw new AppError(`La relacion seleccionada no coincide con el rol del usuario. Permitidas para ${role}: ${allowed.join(', ')}`, 400);
  }
};

export const getAllResidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId, unitId: unitIdFilter } = req.query;
    let queryTenantId_final = req.tenantId;

    if (req.user?.role === 'superadmin' && queryTenantId) {
      queryTenantId_final = String(queryTenantId);
    }

    let residents = await residentsService.findResidentsByTenant(queryTenantId_final);
    if (unitIdFilter) {
      residents = residents.filter((r) => String(r.unitId) === String(unitIdFilter));
    }

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
    const { unitId, tenantId: requestedTenantId, email, relationship } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    const validUnit = await residentsService.validateUnitInTenant(unitId, targetTenantId);
    if (!validUnit) {
      throw new AppError('La unidad no pertenece al tenant actual', 400);
    }

    const currentResidents = await residentsService.countResidentsInUnit(targetTenantId, unitId);
    if (currentResidents >= MAX_RESIDENTS_PER_UNIT) {
      throw new AppError(`La unidad ya tiene el maximo permitido de ${MAX_RESIDENTS_PER_UNIT} residentes`, 400);
    }

    const linkedUser = await ensureLinkedResidentUser(String(email), targetTenantId);
    ensureRelationshipMatchesRole(String(linkedUser.role), String(relationship));

    const resident = await residentsService.createResidentInTenant(req.body, targetTenantId);
    logger.log('residents.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { residentId: String(resident._id), unitId });
    res.status(201).json({ success: true, resident });
  } catch (err: unknown) {
    logger.error('residents.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al crear residente', 400, { cause: toError(err).message }));
  }
};

// Superadmins can manage residents across tenants; when they pass
// ?tenantId=... we use that as the scope, otherwise fall back to the
// token's tenant. All other roles always use req.tenantId.
const resolveResidentTenantScope = (req: Request): string | undefined => {
  const queryTenantId = req.query?.tenantId;
  if (req.user?.role === 'superadmin' && queryTenantId) {
    return String(queryTenantId);
  }
  return req.tenantId;
};

export const updateResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantScope = resolveResidentTenantScope(req);

    const currentResident = await residentsService.findResidentByIdInTenant(String(req.params.id), tenantScope);
    if (!currentResident) {
      throw new AppError('Residente no encontrado', 404);
    }

    if (req.body.unitId && req.body.unitId !== currentResident.unitId.toString()) {
      const validUnit = await residentsService.validateUnitInTenant(req.body.unitId, tenantScope);
      if (!validUnit) {
        throw new AppError('La unidad no pertenece al tenant actual', 400);
      }

      const residentsInTargetUnit = await residentsService.countResidentsInUnit(tenantScope, req.body.unitId);

      if (residentsInTargetUnit >= MAX_RESIDENTS_PER_UNIT) {
        throw new AppError(`La unidad destino ya tiene ${MAX_RESIDENTS_PER_UNIT} residentes`, 400);
      }
    }

    const targetEmail = req.body.email ? String(req.body.email) : String(currentResident.email);
    const targetRelationship = req.body.relationship ? String(req.body.relationship) : String(currentResident.relationship);

    if (!tenantScope) {
      throw new AppError('No se pudo determinar el tenant actual', 400);
    }

    const linkedUser = await ensureLinkedResidentUser(targetEmail, tenantScope);
    ensureRelationshipMatchesRole(String(linkedUser.role), targetRelationship);

    const resident = await residentsService.updateResidentInTenant(String(req.params.id), tenantScope, req.body);

    logger.log('residents.update', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', { residentId: req.params.id });
    res.json({ success: true, resident });
  } catch (err: unknown) {
    logger.error('residents.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar residente', 400, { cause: toError(err).message }));
  }
};

export const deleteResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantScope = resolveResidentTenantScope(req);
    const resident = await residentsService.deleteResidentInTenant(String(req.params.id), tenantScope);
    if (!resident) {
      throw new AppError('Residente no encontrado', 404);
    }

    logger.log('residents.delete', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', { residentId: req.params.id });
    res.json({ success: true, message: 'Residente eliminado' });
  } catch (err: unknown) {
    logger.error('residents.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar residente', 400, { cause: toError(err).message }));
  }
};
