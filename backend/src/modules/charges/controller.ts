import { NextFunction, Request, Response } from 'express';
import Charge from './model';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';

export const getAllCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charges = await Charge.find({ tenantId: req.tenantId });
    res.json({ success: true, charges });
  } catch (err: unknown) {
    next(new AppError('Error al obtener cargos', 500, { cause: toError(err).message }));
  }
};

export const createCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charge = new Charge({ ...req.body, tenantId: req.tenantId });
    await charge.save();
    logger.log('charges.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { chargeId: String(charge._id) });
    res.status(201).json({ success: true, charge });
  } catch (err: unknown) {
    logger.error('charges.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear cargo', 400, { cause: toError(err).message }));
  }
};

export const updateCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charge = await Charge.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!charge) {
      throw new AppError('Cargo no encontrado', 404);
    }

    logger.log('charges.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { chargeId: req.params.id });
    res.json({ success: true, charge });
  } catch (err: unknown) {
    logger.error('charges.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar cargo', 400, { cause: toError(err).message }));
  }
};

export const deleteCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const charge = await Charge.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!charge) {
      throw new AppError('Cargo no encontrado', 404);
    }

    logger.log('charges.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { chargeId: req.params.id });
    res.json({ success: true, message: 'Cargo eliminado' });
  } catch (err: unknown) {
    logger.error('charges.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar cargo', 400, { cause: toError(err).message }));
  }
};
