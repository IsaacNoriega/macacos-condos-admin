import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../../services/cacheService';
import Payment from '../payments/model';
import User from '../users/model';
import Reservation from '../reservations/model';
import Maintenance from '../maintenance/model';
import { AppError } from '../../utils/httpError';

/**
 * Obtiene las estadísticas consolidadas del dashboard con soporte de caché.
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSuperadmin = req.user?.role === 'superadmin';
    const tenantId = req.tenantId;
    
    // Si no es superadmin y no hay tenantId, hay un problema de permisos
    if (!isSuperadmin && !tenantId) throw new AppError('Tenant ID requerido', 400);

    // Para el Superadmin, si no hay tenantId en el request, mostramos global
    const queryTenantId = tenantId || (isSuperadmin ? 'global' : null);
    if (!queryTenantId) throw new AppError('No se pudo determinar el alcance de la consulta', 400);

    const cacheKey = cacheService.generateKey(queryTenantId, 'dashboard', 'stats');

    const stats = await cacheService.getOrSet(cacheKey, async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Si es global (Superadmin sin tenant específico), no filtramos por tenantId
      const matchStage = queryTenantId === 'global' ? {} : { tenantId };

      const [payments, users, reservations, maintenance] = await Promise.all([
        Payment.aggregate([
          { $match: { ...matchStage, status: { $in: ['paid', 'completed'] } } },
          { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        User.countDocuments(matchStage),
        Reservation.countDocuments({ ...matchStage, createdAt: { $gte: sixMonthsAgo } }),
        Maintenance.countDocuments({ ...matchStage, status: { $ne: 'resolved' } })
      ]);

      return {
        payments: payments[0] || { totalAmount: 0, count: 0 },
        usersCount: users,
        recentReservations: reservations,
        openMaintenance: maintenance,
        scope: queryTenantId === 'global' ? 'Global (All Tenants)' : `Tenant: ${tenantId}`,
        updatedAt: new Date()
      };
    });

    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};
