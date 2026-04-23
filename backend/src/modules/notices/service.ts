import Notice from './model';

export const createNotice = async (payload: Record<string, unknown>, tenantId: string) => {
  const notice = new Notice({ ...payload, tenantId });
  await notice.save();
  return notice;
};

export const getNoticesByTenant = (tenantId: string) => {
  return Notice.find({ tenantId }).sort({ createdAt: -1 }).lean();
};
