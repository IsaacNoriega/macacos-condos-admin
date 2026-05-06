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
    const tenantId = req.tenantId;
    if (!tenantId) throw new AppError('Tenant ID requerido', 400);

    const cacheKey = cacheService.generateKey(tenantId, 'dashboard', 'stats');

    // Estrategia Cache-Aside
    const stats = await cacheService.getOrSet(cacheKey, async () => {
      // Definir rango de los últimos 6 meses para las gráficas
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [payments, users, reservations, maintenance] = await Promise.all([
        // Pagos completados
        Payment.aggregate([
          { $match: { tenantId, status: { $in: ['paid', 'completed'] } } },
          { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        // Conteo de usuarios
        User.countDocuments({ tenantId }),
        // Reservaciones recientes
        Reservation.countDocuments({ tenantId, createdAt: { $gte: sixMonthsAgo } }),
        // Mantenimientos abiertos
        Maintenance.countDocuments({ tenantId, status: { $ne: 'resolved' } })
      ]);

      return {
        payments: payments[0] || { totalAmount: 0, count: 0 },
        usersCount: users,
        recentReservations: reservations,
        openMaintenance: maintenance,
        updatedAt: new Date()
      };
    });

    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};
