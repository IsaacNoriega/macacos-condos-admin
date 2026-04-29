import Notice, { INotice } from './model';
import { Types } from 'mongoose';

export class NoticeService {
  async getAllByTenant(tenantId?: string): Promise<INotice[]> {
    const filter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
    return Notice.find(filter).sort({ createdAt: -1 });
  }

  async getById(id: string): Promise<INotice | null> {
    return Notice.findById(id);
  }

  async create(data: Partial<INotice>): Promise<INotice> {
    const notice = new Notice(data);
    return notice.save();
  }

  async update(id: string, data: Partial<INotice>): Promise<INotice | null> {
    return Notice.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Notice.findByIdAndDelete(id);
    return !!result;
  }
}

export default new NoticeService();
