import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, UserMock } = vi.hoisted(() => {
  const saveMock = vi.fn();

  class UserMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();

    [key: string]: unknown;

    constructor(payload: Record<string, unknown>) {
      Object.assign(this, payload);
      this.save = saveMock;
    }

    save: () => Promise<void>;
  }

  return { saveMock, UserMock };
});

vi.mock('./model', () => ({
  __esModule: true,
  default: UserMock,
}));

import {
  createUserInTenant,
  findUsersByTenant,
  updateUserPasswordByResetToken,
} from './service';

describe('users service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findUsersByTenant applies tenant filter and hides password', () => {
    const select = vi.fn();
    UserMock.find.mockReturnValue({ select });

    findUsersByTenant('tenant-1');

    expect(UserMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(select).toHaveBeenCalledWith('-password');
  });

  it('createUserInTenant persists user with tenant', async () => {
    const payload = { name: 'Alice', email: 'alice@example.com' };

    const created = await createUserInTenant(payload, 'tenant-1');

    expect(saveMock).toHaveBeenCalled();
    expect(created).toEqual(expect.objectContaining({ tenantId: 'tenant-1' }));
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
});
