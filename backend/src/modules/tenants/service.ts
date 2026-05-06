import Tenant from './model';
import User from '../users/model';
import Unit from '../units/model';
import Resident from '../residents/model';
import Charge from '../charges/model';
import Payment from '../payments/model';
import Maintenance from '../maintenance/model';
import Reservation from '../reservations/model';
import Amenity from '../amenities/model';
import { deletePaymentProofBlob } from '../../config/azureBlob';

export const findAllTenants = () => {
  return Tenant.find().lean();
};

export const findTenantById = (tenantId: string) => {
  return Tenant.findById(tenantId).lean();
};

export const findTenantByIdentifier = (identifier: string) => {
  return Tenant.findOne({ identifier: identifier.toLowerCase().trim() }).lean();
};

export const createTenant = async (payload: Record<string, unknown>) => {
  if (!payload.identifier && payload.name) {
    payload.identifier = String(payload.name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  const tenant = new Tenant(payload);
  await tenant.save();
  return tenant;
};

export const updateTenant = (tenantId: string, payload: Record<string, unknown>) => {
  return Tenant.findByIdAndUpdate(tenantId, payload, { new: true, lean: true });
};

export const deleteTenant = async (tenantId: string) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return null;
  }

  // Antes de borrar los Payment, remover de Azure cualquier comprobante
  // subido — si primero borramos la fila de Mongo, perdemos la
  // referencia al blob y quedaría huérfano (y facturándose) en Storage.
  const paymentsWithProof = await Payment.find(
    { tenantId, proofOfPaymentBlobName: { $exists: true, $ne: null } },
    { proofOfPaymentBlobName: 1 }
  ).lean();

  await Promise.all(
    paymentsWithProof
      .map((p) => String(p.proofOfPaymentBlobName || ''))
      .filter(Boolean)
      .map((blobName) => deletePaymentProofBlob(blobName))
  );

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
