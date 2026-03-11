import { Request, Response } from 'express';
import Reservation from './model';
import logger from '../../utils/logger';

export const getAllReservations = async (req: Request, res: Response) => {
  try {
    const reservations = await Reservation.find({ tenantId: req.tenantId });
    res.json({ success: true, reservations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener reservaciones', error: err.message });
  }
};

export const createReservation = async (req: Request, res: Response) => {
  try {
    const reservation = new Reservation({ ...req.body, tenantId: req.tenantId });
    await reservation.save();
    logger.log('reservations.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reservationId: String(reservation._id) });
    res.status(201).json({ success: true, reservation });
  } catch (err: any) {
    logger.error('reservations.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear reservación', error: err.message });
  }
};

export const updateReservation = async (req: Request, res: Response) => {
  try {
    const reservation = await Reservation.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservación no encontrada' });
    logger.log('reservations.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reservationId: req.params.id });
    res.json({ success: true, reservation });
  } catch (err: any) {
    logger.error('reservations.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar reservación', error: err.message });
  }
};

export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const reservation = await Reservation.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservación no encontrada' });
    logger.log('reservations.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { reservationId: req.params.id });
    res.json({ success: true, message: 'Reservación eliminada' });
  } catch (err: any) {
    logger.error('reservations.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar reservación', error: err.message });
  }
};
