import Tenant from './model';
import User from '../users/model';
import Unit from '../units/model';
import Resident from '../residents/model';
import Charge from '../charges/model';
import Payment from '../payments/model';
import Maintenance from '../maintenance/model';
import Reservation from '../reservations/model';
import Amenity from '../amenities/model';

export const findAllTenants = () => {
  return Tenant.find();
};

export const findTenantById = (tenantId: string) => {
  return Tenant.findById(tenantId);
};

export const createTenant = async (payload: Record<string, unknown>) => {
  const tenant = new Tenant(payload);
  await tenant.save();
  return tenant;
};

export const updateTenant = (tenantId: string, payload: Record<string, unknown>) => {
  return Tenant.findByIdAndUpdate(tenantId, payload, { new: true });
};

export const deleteTenant = async (tenantId: string) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return null;
  }

  // Elimina toda la data ligada al tenant para evitar registros huérfanos.
  // Intencionalmente sin transacción: el ambiente de ejecución actual
  // (mongod standalone) no soporta transacciones de replica-set, y
  // correr Promise.all dentro de una sola sesión de transacción falla
  // porque MongoDB no permite operaciones paralelas sobre la misma
  // sesión. Sacrificamos atomicidad a cambio de compatibilidad; el
  // peor caso es una limpieza parcial si el proceso muere a la mitad.
  await Promise.all([
    Payment.deleteMany({ tenantId }),
    Charge.deleteMany({ tenantId }),
    Reservation.deleteMany({ tenantId }),
    Maintenance.deleteMany({ tenantId }),
    Resident.deleteMany({ tenantId }),
    Unit.deleteMany({ tenantId }),
    Amenity.deleteMany({ tenantId }),
    User.deleteMany({ tenantId }),
  ]);

  await Tenant.deleteOne({ _id: tenantId });

  return tenant;
};
