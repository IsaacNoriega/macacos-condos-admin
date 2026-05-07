import { NextFunction, Request, Response } from 'express';
import Payment from '../payments/model';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import User from '../users/model';
import Resident from '../residents/model';
import * as chargesService from './service';
import * as residentsService from '../residents/service';
import { queueService } from '../../services/queueService';
import { cacheService } from '../../services/cacheService';

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
    
    // Invalida caché de estadísticas
    await cacheService.invalidateDashboardStats(targetTenantId);

    // Notificar por Email si hay un usuario asignado
    if (charge.userId) {
      try {
        const user = await User.findById(charge.userId).lean();
        if (user && user.email) {
          await queueService.addTask('send-email', {
            type: 'new-charge',
            email: user.email,
            name: user.name,
            amount: charge.amount,
            concept: charge.description,
            dueDate: new Date(charge.dueDate).toLocaleDateString('es-MX'),
            tenantId: targetTenantId
          }, targetTenantId);
        }
      } catch (emailErr) {
        logger.error('charges.email.error', req.user?.id ? String(req.user.id) : 'system', targetTenantId, emailErr as Error);
      }
    }

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

    // Invalida caché de estadísticas
    if (tenantScope) await cacheService.invalidateDashboardStats(String(tenantScope));

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

    // Invalida caché de estadísticas
    if (tenantScope) await cacheService.invalidateDashboardStats(String(tenantScope));

    res.json({ success: true, message: 'Cargo eliminado' });
  } catch (err: unknown) {
    logger.error('charges.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar cargo', 400, { cause: toError(err).message }));
  }
};

export const createBulkCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, description, amount, dueDate, lateFeePerDay } = req.body;

    // Obtener todos los residentes del tenant para tener el vínculo UserId <-> UnitId
    const residents = await Resident.find({ tenantId }).lean();
    
    if (!residents.length) {
      return res.status(404).json({ success: false, message: 'No hay residentes registrados en este condominio' });
    }

    // Mapear residentes a usuarios para obtener sus IDs de usuario (User._id)
    // Asumimos que el email vincula Resident con User
    const emails = residents.map(r => r.email);
    const usersInTenant = await User.find({ email: { $in: emails }, tenantId }).lean();
    const emailToUserId = new Map(usersInTenant.map(u => [u.email.toLowerCase(), u._id]));

    const chargePayloads = residents.map(res => ({
      userId: emailToUserId.get(res.email.toLowerCase()) || null,
      unitId: res.unitId,
      description,
      amount,
      dueDate,
      lateFeePerDay,
      tenantId,
      isPaid: false
    })).filter(p => p.userId); // Solo personas con usuario activo

    if (!chargePayloads.length) {
      return res.status(404).json({ success: false, message: 'No se encontraron usuarios activos vinculados a residentes' });
    }

    // Crear cargos masivamente
    const charges = await chargesService.createBulkChargesInTenant(chargePayloads, tenantId);

    // Invalidad dashboard stats
    await cacheService.invalidateDashboardStats(tenantId);

    // Encolar emails para los que tienen usuario
    const dueDateStr = new Date(dueDate).toLocaleDateString('es-MX');
    const emailPromises = chargePayloads.map(payload => {
      // Buscar el email del usuario para la notificación
      const user = usersInTenant.find(u => String(u._id) === String(payload.userId));
      if (!user) return Promise.resolve();

      return queueService.addTask('send-email', {
        type: 'new-charge',
        email: user.email,
        name: user.name,
        amount,
        concept: description,
        dueDate: dueDateStr,
        tenantId
      }, tenantId);
    });

    await Promise.all(emailPromises);

    logger.log('charges.bulk_create', req.user?.id ? String(req.user.id) : 'system', tenantId, { 
      count: charges.length,
      description 
    });

    res.status(201).json({ 
      success: true, 
      message: `Se crearon ${charges.length} cargos y se enviaron las notificaciones.`,
      count: charges.length 
    });
  } catch (err: unknown) {
    logger.error('charges.bulk.error', req.user?.id ? String(req.user.id) : 'system', req.body.tenantId || 'global', toError(err));
    next(new AppError('Error al crear cargos masivos', 500, { cause: toError(err).message }));
  }
};
