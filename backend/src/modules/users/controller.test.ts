import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllUsers: vi.fn(),
  findUsersByTenant: vi.fn(),
  findUserByIdInTenant: vi.fn(),
  createUserInTenant: vi.fn(),
  updateUserInTenant: vi.fn(),
  deleteUserInTenant: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-pass'),
  },
}));

import { createUser, deleteUser, getAllUsers, getUserById, updateUser } from './controller';
import {
  createUserInTenant,
  deleteUserInTenant,
  findUserByIdInTenant,
  findUsersByTenant,
  updateUserInTenant,
} from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('users controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllUsers ──────────────────────────────────────────────────────────────

  describe('getAllUsers', () => {
    it('returns tenant users for admin role', async () => {
      vi.mocked(findUsersByTenant).mockResolvedValue([{ _id: 'u1', name: 'John' }] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUsers(req, res, next);

      expect(findUsersByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, users: [{ _id: 'u1', name: 'John' }] });
    });

    it('returns all users for superadmin without queryTenantId', async () => {
      const { findAllUsers } = await import('./service');
      vi.mocked(findAllUsers).mockResolvedValue([{ _id: 'u1' }, { _id: 'u2' }] as any);

      const req = mockRequest({ user: { role: 'superadmin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUsers(req, res, next);

      expect(findAllUsers).toHaveBeenCalled();
    });

    it('returns filtered users for superadmin with queryTenantId', async () => {
      vi.mocked(findUsersByTenant).mockResolvedValue([{ _id: 'u1' }] as any);

      const req = mockRequest({
        user: { role: 'superadmin' },
        query: { tenantId: 'tenant-2' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUsers(req, res, next);

      expect(findUsersByTenant).toHaveBeenCalledWith('tenant-2');
    });
  });

  // ─── getUserById ─────────────────────────────────────────────────────────────

  describe('getUserById', () => {
    it('returns user when found', async () => {
      vi.mocked(findUserByIdInTenant).mockResolvedValue({ _id: 'u1', name: 'Alice' } as any);

      const req = mockRequest({ params: { id: 'u1' }, tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getUserById(req, res, next);

      expect(findUserByIdInTenant).toHaveBeenCalledWith('u1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, user: { _id: 'u1', name: 'Alice' } });
    });

    it('calls next with 404 when user not found', async () => {
      vi.mocked(findUserByIdInTenant).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'unknown' }, tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getUserById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── createUser ──────────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('hashes password and persists via service', async () => {
      const toObject = () => ({ _id: 'u2', role: 'admin', password: 'secret' });
      vi.mocked(createUserInTenant).mockResolvedValue({ _id: 'u2', role: 'admin', toObject } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { name: 'Alice', email: 'alice@example.com', password: '123456', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createUser(req, res, next);

      expect(createUserInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alice', email: 'alice@example.com', role: 'admin' }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with error when tenantId is missing', async () => {
      const req = mockRequest({
        user: { id: 'admin-1', role: 'admin' },
        body: { name: 'Alice', email: 'alice@example.com', password: '123456', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createUser(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── updateUser ──────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('updates user and returns result', async () => {
      vi.mocked(updateUserInTenant).mockResolvedValue({ _id: 'u1', name: 'Updated' } as any);

      const req = mockRequest({
        params: { id: 'u1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { name: 'Updated' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateUser(req, res, next);

      expect(updateUserInTenant).toHaveBeenCalledWith('u1', 'tenant-1', { name: 'Updated' });
      expect(res.json).toHaveBeenCalledWith({ success: true, user: { _id: 'u1', name: 'Updated' } });
    });

    it('calls next with 404 when user not found on update', async () => {
      vi.mocked(updateUserInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'missing' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { name: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateUser(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deleteUser ──────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('deletes user and returns success message', async () => {
      vi.mocked(deleteUserInTenant).mockResolvedValue({ _id: 'u1' } as any);

      const req = mockRequest({
        params: { id: 'u1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteUser(req, res, next);

      expect(deleteUserInTenant).toHaveBeenCalledWith('u1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Usuario eliminado' });
    });

    it('calls next with 404 when user not found on delete', async () => {
      vi.mocked(deleteUserInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteUser(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
