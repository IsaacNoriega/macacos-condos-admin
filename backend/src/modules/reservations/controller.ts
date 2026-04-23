import { NextFunction, Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import AmenityModel from '../amenities/model';
import ReservationModel from './model';
import {
  createReservationInTenant,
  deleteReservationInTenant,
  findReservationByIdInTenant,
  findReservationConflict,
  findAllReservations,
  findReservationsByTenant,
  serializeReservation,
  updateReservationInTenant,
} from './service';

export const getAllReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    const reservations = req.user?.role === 'superadmin'
      ? queryTenantId
        ? await findReservationsByTenant(String(queryTenantId))
        : await findAllReservations()
      : await findReservationsByTenant(req.tenantId);

    res.json({ success: true, reservations: reservations.map((reservation) => serializeReservation(reservation)) });
  } catch (err: unknown) {
    next(new AppError('Error al obtener reservaciones', 500, { cause: toError(err).message }));
  }
};

export const createReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amenity, start, end, tenantId: requestedTenantId, userId: requestedUserId, ...rest } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError('Fechas inválidas para reservación', 400);
    }

    if (startDate >= endDate) {
      throw new AppError('La fecha de inicio debe ser menor que la fecha de fin', 400);
    }

    if (await findReservationConflict(targetTenantId, amenity, startDate, endDate)) {
      throw new AppError('Conflicto de reservación: la amenidad ya está reservada en ese horario', 409);
    }

    // Validar límite de horas diarias
    // Buscar la amenidad para obtener el límite
    const amenityDoc = await AmenityModel.findOne({ name: amenity, tenantId: targetTenantId });
    if (!amenityDoc) {
      throw new AppError('Amenidad no encontrada', 404);
    }
    const maxDailyHours = amenityDoc.maxDailyHours;
    // Calcular el total de horas reservadas para ese día
    const day = new Date(startDate);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const existingReservations = await ReservationModel.find({
      tenantId: targetTenantId,
      amenity,
      status: 'activa',
      start: { $gte: day, $lt: nextDay },
    });
    let totalHours = 0;
    for (const r of existingReservations) {
      const rStart = new Date(r.start);
      const rEnd = new Date(r.end);
      totalHours += (rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60);
    }
    // Sumar la nueva reservación
    totalHours += (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (totalHours > maxDailyHours) {
      throw new AppError(`No puedes reservar más de ${maxDailyHours} horas para esta amenidad en el mismo día`, 400);
    }

    const targetUserId = req.user?.role === 'residente' || req.user?.role === 'familiar'
      ? String(req.user.id)
      : (requestedUserId ? String(requestedUserId) : String(req.user?.id || ''));

    const reservation = await createReservationInTenant(
      { ...rest, amenity, userId: targetUserId, start: startDate, end: endDate },
      targetTenantId
    );
    logger.log('reservations.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { reservationId: String(reservation._id) });
    res.status(201).json({ success: true, reservation: serializeReservation(reservation) });
  } catch (err: unknown) {
    logger.error('reservations.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al crear reservación', 400, { cause: toError(err).message }));
  }
};

export const updateReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentReservation = await findReservationByIdInTenant(String(req.params.id), req.tenantId);
    if (!currentReservation) {
      throw new AppError('Reservación no encontrada', 404);
    }

    const role = req.user?.role;
    const isSelfServiceRole = role === 'residente' || role === 'familiar';
    const currentUserId = req.user?.id ? String(req.user.id) : '';
    if (isSelfServiceRole && String(currentReservation.userId) !== currentUserId) {
      throw new AppError('No tienes permiso para actualizar reservaciones de otros usuarios', 403);
    }

    const nextAmenityRaw = req.body.amenity ?? currentReservation.amenity;
    if (Array.isArray(nextAmenityRaw)) {
      throw new AppError('Amenidad inválida', 400);
    }
    const nextAmenity = String(nextAmenityRaw);
    const nextStart = req.body.start ? new Date(req.body.start) : currentReservation.start;
    const nextEnd = req.body.end ? new Date(req.body.end) : currentReservation.end;

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
      throw new AppError('Fechas inválidas para reservación', 400);
    }

    if (nextStart >= nextEnd) {
      throw new AppError('La fecha de inicio debe ser menor que la fecha de fin', 400);
    }

    if (await findReservationConflict(req.tenantId as string, nextAmenity, nextStart, nextEnd, String(req.params.id))) {
      throw new AppError('Conflicto de reservación: la amenidad ya está reservada en ese horario', 409);
    }

    // Validar límite de horas diarias al actualizar
    const amenityDoc = await AmenityModel.findOne({ name: nextAmenity, tenantId: req.tenantId });
    if (!amenityDoc) {
      throw new AppError('Amenidad no encontrada', 404);
    }
    const maxDailyHours = amenityDoc.maxDailyHours;
    // Calcular el total de horas reservadas para ese día, excluyendo la actual
    const day = new Date(nextStart);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const existingReservations = await ReservationModel.find({
      tenantId: req.tenantId,
      amenity: nextAmenity,
      status: 'activa',
      start: { $gte: day, $lt: nextDay },
      _id: { $ne: currentReservation._id },
    });
    let totalHours = 0;
    for (const r of existingReservations) {
      const rStart = new Date(r.start);
      const rEnd = new Date(r.end);
      totalHours += (rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60);
    }
    // Sumar la reservación actualizada
    totalHours += (nextEnd.getTime() - nextStart.getTime()) / (1000 * 60 * 60);
    if (totalHours > maxDailyHours) {
      throw new AppError(`No puedes reservar más de ${maxDailyHours} horas para esta amenidad en el mismo día`, 400);
    }

    const payload: Record<string, unknown> = {
      ...req.body,
      amenity: nextAmenity,
      start: nextStart,
      end: nextEnd,
    };

    if (isSelfServiceRole) {
      delete payload.userId;
      delete payload.tenantId;
    }

    const reservation = await updateReservationInTenant(String(req.params.id), req.tenantId, payload);

    logger.log('reservations.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reservationId: req.params.id });
    res.json({ success: true, reservation: serializeReservation(reservation) });
  } catch (err: unknown) {
    logger.error('reservations.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar reservación', 400, { cause: toError(err).message }));
  }
};

export const deleteReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentReservation = await findReservationByIdInTenant(String(req.params.id), req.tenantId);
    if (!currentReservation) {
      throw new AppError('Reservación no encontrada', 404);
    }

    const role = req.user?.role;
    const isSelfServiceRole = role === 'residente' || role === 'familiar';
    const currentUserId = req.user?.id ? String(req.user.id) : '';
    if (isSelfServiceRole && String(currentReservation.userId) !== currentUserId) {
      throw new AppError('No tienes permiso para eliminar reservaciones de otros usuarios', 403);
    }

    const reservation = await deleteReservationInTenant(String(req.params.id), req.tenantId);
    if (!reservation) {
      throw new AppError('Reservación no encontrada', 404);
    }

    logger.log('reservations.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reservationId: req.params.id });
    res.json({ success: true, message: 'Reservación eliminada' });
  } catch (err: unknown) {
    logger.error('reservations.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar reservación', 400, { cause: toError(err).message }));
  }
};
