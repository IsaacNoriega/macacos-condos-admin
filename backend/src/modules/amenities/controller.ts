import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as amenitiesService from './service';

export const getAllAmenities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    let tenantId = req.tenantId;

    if (req.user?.role === 'superadmin' && queryTenantId) {
      tenantId = String(queryTenantId);
    }

    const amenities = await amenitiesService.findAmenitiesByTenant(tenantId);
    res.json({ success: true, amenities });
  } catch (err: unknown) {
    next(new AppError('Error al obtener amenidades', 500, { cause: toError(err).message }));
  }
};

export const createAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: requestedTenantId, ...payload } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    const amenity = await amenitiesService.createAmenityInTenant(payload, targetTenantId);
    logger.log('amenities.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { amenityId: String(amenity._id) });
    res.status(201).json({ success: true, amenity });
  } catch (err: unknown) {
    logger.error('amenities.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear amenidad', 400, { cause: toError(err).message }));
  }
};

export const updateAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amenity = await amenitiesService.updateAmenityInTenant(String(req.params.id), req.tenantId, req.body);
    if (!amenity) {
      throw new AppError('Amenidad no encontrada', 404);
    }

    logger.log('amenities.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { amenityId: req.params.id });
    res.json({ success: true, amenity });
  } catch (err: unknown) {
    logger.error('amenities.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar amenidad', 400, { cause: toError(err).message }));
  }
};

export const deleteAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amenity = await amenitiesService.deleteAmenityInTenant(String(req.params.id), req.tenantId);
    if (!amenity) {
      throw new AppError('Amenidad no encontrada', 404);
    }

    logger.log('amenities.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { amenityId: req.params.id });
    res.json({ success: true, message: 'Amenidad eliminada' });
  } catch (err: unknown) {
    logger.error('amenities.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar amenidad', 400, { cause: toError(err).message }));
  }
};
