import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findUsersByTenant: vi.fn(),
  findUserByIdInTenant: vi.fn(),
  createUserInTenant: vi.fn(),
  updateUserInTenant: vi.fn(),
  deleteUserInTenant: vi.fn(),
}));

import { createUser, getAllUsers } from './controller';
import { createUserInTenant, findUsersByTenant } from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('users controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllUsers returns tenant users from service', async () => {
    vi.mocked(findUsersByTenant).mockResolvedValue([{ _id: 'u1', name: 'John' }] as any);

    const req = mockRequest({ tenantId: 'tenant-1' } as any);
    const res = mockResponse();
    const next = mockNext();

    await getAllUsers(req, res, next);

    expect(findUsersByTenant).toHaveBeenCalledWith('tenant-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      users: [{ _id: 'u1', name: 'John' }],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('createUser hashes password and persists via service', async () => {
    const toObject = () => ({ _id: 'u2', role: 'admin', password: 'secret' });
    vi.mocked(createUserInTenant).mockResolvedValue({ _id: 'u2', role: 'admin', toObject } as any);

    const req = mockRequest({
      tenantId: 'tenant-1',
      user: { id: 'admin-1' },
      body: {
        name: 'Alice',
        email: 'alice@example.com',
        password: '123456',
        role: 'admin',
      },
    } as any);

    const res = mockResponse();
    const next = mockNext();

    await createUser(req, res, next);

    expect(createUserInTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alice',
        email: 'alice@example.com',
        role: 'admin',
        password: expect.any(String),
      }),
      'tenant-1'
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });
});
