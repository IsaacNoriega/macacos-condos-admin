import mongoose, { Document, Schema } from 'mongoose';

export interface INotice extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  createdAt: Date;
}

const noticeSchema = new Schema<INotice>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Notice = mongoose.model<INotice>('Notice', noticeSchema);
export default Notice;
