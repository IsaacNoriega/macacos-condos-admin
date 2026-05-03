import { NextFunction, Request, Response } from 'express';
import Payment from '../payments/model';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import User from '../users/model';
import * as chargesService from './service';
import * as residentsService from '../residents/service';

type ChargeWithStatusBase = {
  _id: unknown;
  isPaid?: boolean;
};

const enrichChargesWithPaymentStatus = async <T extends ChargeWithStatusBase>(charges: T[]): Promise<Array<T & { paymentStatus: string }>> => {
  if (!charges.length) {
    return [];
  }

  const chargeIds = charges
    .map((charge) => String(charge._id))
    .filter((id) => id.length > 0);

  if (!chargeIds.length) {
    return charges.map((charge) => ({
      ...charge,
      paymentStatus: charge.isPaid ? 'paid' : 'pending',
    }));
  }

  const payments = await Payment.find({ chargeId: { $in: chargeIds } })
    .select('chargeId status paymentDate createdAt')
    .lean();

  const latestPaymentByCharge = new Map<string, { status?: string; paymentDate?: Date; createdAt?: Date }>();

  for (const payment of payments) {
    const chargeId = String(payment.chargeId);
    const existing = latestPaymentByCharge.get(chargeId);
    const paymentTs = new Date(payment.paymentDate || payment.createdAt || 0).getTime();
    const existingTs = existing ? new Date(existing.paymentDate || existing.createdAt || 0).getTime() : -1;

    if (!existing || paymentTs >= existingTs) {
      latestPaymentByCharge.set(chargeId, {
        status: typeof payment.status === 'string' ? payment.status : undefined,
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt,
      });
    }
  }

  return charges.map((charge) => {
    const chargeId = String(charge._id);
    const latestPayment = latestPaymentByCharge.get(chargeId);

    // A settled charge must stay 'paid' even if a later abandoned/pending
    // Stripe attempt exists; only non-settled charges defer to the latest
    // payment row for display status.
    const paymentStatus = charge.isPaid
      ? 'paid'
      : latestPayment?.status || 'pending';

    return {
      ...charge,
      paymentStatus,
    };
  });
};

export const getAllCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId, userId, unitId } = req.query;
    let charges;

    if (req.user?.role === 'superadmin') {
      charges = queryTenantId
        ? await chargesService.findChargesByTenant(String(queryTenantId))
        : await chargesService.findAllCharges();
    } else if (req.user?.role === 'residente' || req.user?.role === 'familiar') {
      let email = req.user.email;
      if (!email && req.user.id) {
        const u = await User.findById(req.user.id).select('email').lean();
        email = u?.email;
      }
      if (!email) {
        throw new AppError('No se pudo determinar el correo del usuario', 400);
      }
      const userResidents = await residentsService.findUnitsByUserEmail(email, req.tenantId);
      const unitIds = userResidents.map((r) => r.unitId);
      charges = await chargesService.findChargesByUnits(unitIds, req.tenantId);
    } else {
      // Build filter for admins/staff
      const filter: any = { tenantId: req.tenantId };
      
      if (userId && unitId) {
        // Find specific for user OR unit-wide (where userId is null/empty)
        filter.$or = [
          { userId },
          { unitId, userId: { $in: [null, undefined, ''] } }
        ];
      } else if (userId) {
        filter.userId = userId;
      } else if (unitId) {
        filter.unitId = unitId;
      }

      charges = await chargesService.findCharges(filter);
    }

    const chargesWithPaymentStatus = await enrichChargesWithPaymentStatus(charges);
    res.json({ success: true, charges: chargesWithPaymentStatus });
  } catch (err: unknown) {
    next(new AppError('Error al obtener cargos', 500, { cause: toError(err).message }));
  }
};

export const createCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: requestedTenantId, ...payload } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    if (payload.userId === '') delete payload.userId;
    const charge = await chargesService.createChargeInTenant(payload, targetTenantId);
    logger.log('charges.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { chargeId: String(charge._id) });
    res.status(201).json({ success: true, charge });
  } catch (err: unknown) {
    logger.error('charges.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al crear cargo', 400, { cause: toError(err).message }));
  }
};

export const updateCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: bodyTenantId, ...payload } = req.body;
    const { tenantId: queryTenantId } = req.query;
    const tenantScope = req.user?.role === 'superadmin' ? (queryTenantId || bodyTenantId || undefined) : req.tenantId;

    if (payload.userId === '') payload.userId = null;
    const charge = await chargesService.updateChargeInTenant(String(req.params.id), tenantScope ? String(tenantScope) : undefined, payload);
    if (!charge) {
      throw new AppError('Cargo no encontrado', 404);
    }

    logger.log('charges.update', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', { chargeId: req.params.id });
    res.json({ success: true, charge });
  } catch (err: unknown) {
    logger.error('charges.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar cargo', 400, { cause: toError(err).message }));
  }
};

export const deleteCharge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    const tenantScope = req.user?.role === 'superadmin' ? (queryTenantId ? String(queryTenantId) : undefined) : req.tenantId;
    const charge = await chargesService.deleteChargeInTenant(String(req.params.id), tenantScope);
    if (!charge) {
      throw new AppError('Cargo no encontrado', 404);
    }

    logger.log('charges.delete', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', { chargeId: req.params.id });
    res.json({ success: true, message: 'Cargo eliminado' });
  } catch (err: unknown) {
    logger.error('charges.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar cargo', 400, { cause: toError(err).message }));
  }
};
