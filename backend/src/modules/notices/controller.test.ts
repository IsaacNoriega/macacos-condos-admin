import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./service', () => ({
  createNotice: vi.fn(),
  getNoticesByTenant: vi.fn(),
}));

import { createNotice, getNoticesByTenant } from './controller';
import * as noticeService from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('notices controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createNotice ────────────────────────────────────────────────────────────

  describe('createNotice', () => {
    it('returns 400 when required fields are missing', async () => {
      const req = mockRequest({ body: { title: 'Aviso' } });
      const res = mockResponse();
      const next = mockNext();

      await createNotice(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('creates notice and returns 201', async () => {
      vi.mocked(noticeService.createNotice).mockResolvedValue({
        _id: 'n1',
        title: 'Reunión de condóminos',
        message: 'El sábado a las 10am',
      } as any);

      const req = mockRequest({
        body: {
          tenantId: 'tenant-1',
          title: 'Reunión de condóminos',
          message: 'El sábado a las 10am',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      await createNotice(req, res, next);

      expect(noticeService.createNotice).toHaveBeenCalledWith(
        { title: 'Reunión de condóminos', message: 'El sábado a las 10am' },
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── getNoticesByTenant ──────────────────────────────────────────────────────

  describe('getNoticesByTenant', () => {
    it('returns 400 when tenantId is missing', async () => {
      const req = mockRequest({ params: {}, tenantId: undefined } as any);
      const res = mockResponse();
      const next = mockNext();

      await getNoticesByTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns notices for a given tenantId from params', async () => {
      vi.mocked(noticeService.getNoticesByTenant).mockResolvedValue([
        { _id: 'n1', title: 'Aviso 1' },
      ] as any);

      const req = mockRequest({ params: { tenantId: 'tenant-1' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getNoticesByTenant(req, res, next);

      expect(noticeService.getNoticesByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        notices: [{ _id: 'n1', title: 'Aviso 1' }],
      });
    });

    it('uses req.tenantId when params.tenantId is absent', async () => {
      vi.mocked(noticeService.getNoticesByTenant).mockResolvedValue([]);

      const req = mockRequest({ params: {}, tenantId: 'tenant-2' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getNoticesByTenant(req, res, next);

      expect(noticeService.getNoticesByTenant).toHaveBeenCalledWith('tenant-2');
    });
  });
});
