import User, { IUser } from './model';

export const findUsersByTenant = (tenantId?: string) => {
  return User.find({ tenantId }).select('-password');
};

export const findUserByIdInTenant = (userId: string, tenantId?: string) => {
  return User.findOne({ _id: userId, tenantId }).select('-password');
};

export const createUserInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const user = new User({ ...payload, tenantId });
  await user.save();
  return user;
};

export const updateUserInTenant = (userId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  return User.findOneAndUpdate(
    { _id: userId, tenantId },
    payload,
    { new: true }
  ).select('-password');
};

export const deleteUserInTenant = (userId: string, tenantId?: string) => {
  return User.findOneAndDelete({ _id: userId, tenantId });
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
