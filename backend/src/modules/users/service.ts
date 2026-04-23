import User, { IUser } from './model';
import mongoose from 'mongoose';
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
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userFilter = tenantId ? { _id: userId, tenantId } : { _id: userId };
    const user = await User.findOne(userFilter).session(session);

    if (!user) {
      await session.abortTransaction();
      return null;
    }

    const scopedFilter = tenantId ? { tenantId } : {};

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
      Resident.deleteMany({ ...scopedFilter, email: user.email }, { session }),
      Payment.updateMany(
        { ...scopedFilter, reviewedBy: userId },
        { $unset: { reviewedBy: 1, reviewedAt: 1 } },
        { session }
      ),
      Maintenance.updateMany(
        { ...scopedFilter, assignedTo: userId },
        { $unset: { assignedTo: 1 } },
        { session }
      ),
      Maintenance.updateMany(
        { ...scopedFilter, 'history.changedBy': userId },
        { $pull: { history: { changedBy: userId } } },
        { session }
      ),
    ]);

    await User.deleteOne({ _id: userId }, { session });

    await session.commitTransaction();
    return user;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
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
