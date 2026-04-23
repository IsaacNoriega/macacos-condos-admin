import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, UserMock } = vi.hoisted(() => {
  const saveMock = vi.fn();

  class UserMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static deleteOne = vi.fn();

    [key: string]: unknown;

    constructor(payload: Record<string, unknown>) {
      Object.assign(this, payload);
      this.save = saveMock;
    }

    save: () => Promise<void>;
    password?: string | null;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
  }

  return { saveMock, UserMock };
});

vi.mock('./model', () => ({ __esModule: true, default: UserMock }));
vi.mock('../charges/model', () => ({ __esModule: true, default: { deleteMany: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}) } }));
vi.mock('../payments/model', () => ({ __esModule: true, default: { deleteMany: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}) } }));
vi.mock('../reservations/model', () => ({ __esModule: true, default: { deleteMany: vi.fn().mockResolvedValue({}) } }));
vi.mock('../maintenance/model', () => ({ __esModule: true, default: { deleteMany: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}) } }));
vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn().mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  },
}));

import {
  createUserInTenant,
  findAllUsers,
  findUserByEmailInTenant,
  findUserByIdInTenant,
  findUsersByEmail,
  findUsersByTenant,
  updateUserInTenant,
  updateUserPasswordByResetToken,
} from './service';

describe('users service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllUsers calls User.find({}).select', () => {
    const select = vi.fn().mockReturnValue([]);
    UserMock.find.mockReturnValue({ select });
    findAllUsers();
    expect(UserMock.find).toHaveBeenCalledWith({});
    expect(select).toHaveBeenCalledWith('-password');
  });

  it('findUsersByTenant applies tenant filter and hides password', () => {
    const select = vi.fn();
    UserMock.find.mockReturnValue({ select });
    findUsersByTenant('tenant-1');
    expect(UserMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(select).toHaveBeenCalledWith('-password');
  });

  it('findUsersByTenant with undefined returns all users', () => {
    const select = vi.fn().mockReturnValue([]);
    UserMock.find.mockReturnValue({ select });
    findUsersByTenant(undefined);
    expect(UserMock.find).toHaveBeenCalledWith({});
  });

  it('findUserByIdInTenant queries with tenantId', () => {
    const select = vi.fn().mockReturnValue({ _id: 'u1' });
    UserMock.findOne.mockReturnValue({ select });
    findUserByIdInTenant('u1', 'tenant-1');
    expect(UserMock.findOne).toHaveBeenCalledWith({ _id: 'u1', tenantId: 'tenant-1' });
  });

  it('findUserByIdInTenant queries without tenantId', () => {
    const select = vi.fn().mockReturnValue(null);
    UserMock.findOne.mockReturnValue({ select });
    findUserByIdInTenant('u1', undefined);
    expect(UserMock.findOne).toHaveBeenCalledWith({ _id: 'u1' });
  });

  it('createUserInTenant persists user with tenant', async () => {
    const payload = { name: 'Alice', email: 'alice@example.com' };
    const created = await createUserInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(created).toEqual(expect.objectContaining({ tenantId: 'tenant-1' }));
  });

  it('updateUserInTenant calls findOneAndUpdate with tenantId filter', () => {
    const select = vi.fn().mockReturnValue({ _id: 'u1' });
    UserMock.findOneAndUpdate.mockReturnValue({ select });
    updateUserInTenant('u1', 'tenant-1', { name: 'Updated' });
    expect(UserMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u1', tenantId: 'tenant-1' },
      { name: 'Updated' },
      { new: true }
    );
  });

  it('updateUserInTenant calls findOneAndUpdate without tenantId', () => {
    const select = vi.fn().mockReturnValue({ _id: 'u1' });
    UserMock.findOneAndUpdate.mockReturnValue({ select });
    updateUserInTenant('u1', undefined, { name: 'Updated' });
    expect(UserMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u1' },
      { name: 'Updated' },
      { new: true }
    );
  });

  it('findUserByEmailInTenant queries by email and tenantId', () => {
    UserMock.findOne.mockReturnValue({ _id: 'u1' });
    findUserByEmailInTenant('alice@x.com', 'tenant-1');
    expect(UserMock.findOne).toHaveBeenCalledWith({ email: 'alice@x.com', tenantId: 'tenant-1' });
  });

  it('findUsersByEmail queries by email only', () => {
    UserMock.find.mockReturnValue([]);
    findUsersByEmail('alice@x.com');
    expect(UserMock.find).toHaveBeenCalledWith({ email: 'alice@x.com' });
  });

  it('updateUserPasswordByResetToken returns null when token not found', async () => {
    UserMock.findOne.mockResolvedValue(null);
    const result = await updateUserPasswordByResetToken('invalid-hash', 'new-hash');
    expect(result).toBeNull();
  });

  it('updateUserPasswordByResetToken clears reset metadata after update', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const user = {
      password: 'old',
      resetPasswordToken: 'hash',
      resetPasswordExpires: new Date(),
      save,
    } as any;

    UserMock.findOne.mockResolvedValue(user);

    const result = await updateUserPasswordByResetToken('hash', 'hashed-pass');

    expect(UserMock.findOne).toHaveBeenCalled();
    expect(user.password).toBe('hashed-pass');
    expect(user.resetPasswordToken).toBeNull();
    expect(user.resetPasswordExpires).toBeNull();
    expect(save).toHaveBeenCalled();
    expect(result).toBe(user);
  });

  it('deleteUserInTenant returns null when user not found', async () => {
    const mongoose = await import('mongoose');
    const sessionObj = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };
    vi.mocked(mongoose.default.startSession).mockResolvedValue(sessionObj as any);

    // Simulate findOne returning a chainable .session() that returns null
    UserMock.findOne.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });

    const { deleteUserInTenant } = await import('./service');
    const result = await deleteUserInTenant('nonexistent', 'tenant-1');

    expect(result).toBeNull();
    expect(sessionObj.abortTransaction).toHaveBeenCalled();
    expect(sessionObj.endSession).toHaveBeenCalled();
  });
});
