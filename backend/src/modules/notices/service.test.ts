import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, NoticeMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class NoticeMock {
    static find = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  return { saveMock, NoticeMock };
});

vi.mock('./model', () => ({ __esModule: true, default: NoticeMock }));

import { createNotice, getNoticesByTenant } from './service';

describe('notices service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('createNotice persists notice with tenantId', async () => {
    const result = await createNotice({ title: 'Aviso importante', message: 'Texto del aviso' }, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', title: 'Aviso importante' }));
  });

  it('getNoticesByTenant queries with sort and lean', () => {
    const lean = vi.fn().mockReturnValue([]);
    const sort = vi.fn().mockReturnValue({ lean });
    NoticeMock.find.mockReturnValue({ sort });

    getNoticesByTenant('tenant-1');

    expect(NoticeMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(lean).toHaveBeenCalled();
  });
});
