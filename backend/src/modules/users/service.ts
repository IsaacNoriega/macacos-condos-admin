import User, { IUser } from './model';
import Payment from '../payments/model';
import Maintenance from '../maintenance/model';
import Resident from '../residents/model';

export const findAllUsers = () => {
  return User.find({}).select('-password');
};

export const findUsersByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId } : {};
  return User.find(filter).select('-password');
};

export const findUserByIdInTenant = (userId: string, tenantId?: string) => {
  const filter = tenantId ? { _id: userId, tenantId } : { _id: userId };
  return User.findOne(filter).select('-password');
};

export const createUserInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const user = new User({ ...payload, tenantId });
  await user.save();
  return user;
};

export const updateUserInTenant = (userId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  const filter = tenantId ? { _id: userId, tenantId } : { _id: userId };
  return User.findOneAndUpdate(
    filter,
    payload,
    { new: true }
  ).select('-password');
};

export const deleteUserInTenant = async (userId: string, tenantId?: string) => {
  // Intencionalmente sin transacción: mongod standalone no soporta
  // transacciones de replica-set, y correr Promise.all dentro de una
  // misma sesión de transacción falla porque MongoDB no permite
  // operaciones paralelas sobre una sola sesión. Aceptamos la pérdida
  // de atomicidad a cambio de compatibilidad con el despliegue actual.
  const userFilter = tenantId ? { _id: userId, tenantId } : { _id: userId };
  const user = await User.findOne(userFilter);

  if (!user) {
    return null;
  }

  // Always scope the cascade cleanup to the user's own tenant. When a
  // superadmin calls DELETE /users/:id without ?tenantId=... we would
  // otherwise fall back to an unscoped filter and touch every tenant
  // with matching email/userId references — a cross-tenant data-loss
  // hazard. The user row itself was already looked up above and is
  // what tells us which tenant to confine the cleanup to.
  const scopedTenantId = tenantId || String(user.tenantId || '');
  const scopedFilter = scopedTenantId ? { tenantId: scopedTenantId } : {};

  // Anonymize, don't hard-delete: preserving Payments, Charges,
  // Reservations, and Maintenance rows when a user is removed keeps
  // tenant financial history and audit trails intact. We only unset
  // relational references so the historical rows stay queryable.
  //
  // Residents are a different case — they are contact/linkage records
  // keyed by email and are required to point at a live user in the
  // same tenant (see residents.updateResident). Leaving orphaned
  // residents would make admins unable to edit them afterwards, so
  // the matching resident rows are removed when their linked user is
  // deleted.
  await Promise.all([
    Resident.deleteMany({ ...scopedFilter, email: user.email }),
    Payment.updateMany(
      { ...scopedFilter, reviewedBy: userId },
      { $unset: { reviewedBy: 1, reviewedAt: 1 } }
    ),
    Maintenance.updateMany(
      { ...scopedFilter, assignedTo: userId },
      { $unset: { assignedTo: 1 } }
    ),
    // Anonymize the maintenance status-change timeline rather than
    // $pull-ing the entries — the history is audit data and losing
    // the entries when a staff user is removed would silently erase
    // who did what. Clearing changedBy keeps the event + timestamp.
    Maintenance.updateMany(
      { ...scopedFilter, 'history.changedBy': userId },
      { $set: { 'history.$[entry].changedBy': null } },
      { arrayFilters: [{ 'entry.changedBy': userId }] }
    ),
  ]);

  await User.deleteOne({ _id: userId });

  return user;
};

export const findUserByEmailInTenant = (email: string, tenantId: string) => {
  return User.findOne({ email, tenantId });
};

export const findUsersByEmail = (email: string) => {
  return User.find({ email });
};

export const updateUserPasswordByResetToken = async (resetTokenHash: string, hashedPassword: string): Promise<IUser | null> => {
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return null;
  }

  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();
  return user;
};
