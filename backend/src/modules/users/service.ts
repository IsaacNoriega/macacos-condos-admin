import User, { IUser } from './model';
import mongoose from 'mongoose';
import Charge from '../charges/model';
import Payment from '../payments/model';
import Reservation from '../reservations/model';
import Maintenance from '../maintenance/model';

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

    await Promise.all([
      Payment.deleteMany({ ...scopedFilter, userId }, { session }),
      Charge.deleteMany({ ...scopedFilter, userId }, { session }),
      Reservation.deleteMany({ ...scopedFilter, userId }, { session }),
      Maintenance.deleteMany({ ...scopedFilter, userId }, { session }),
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
