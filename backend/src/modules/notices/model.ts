import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  category: 'info' | 'urgente' | 'evento';
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    category: {
      type: String,
      enum: ['info', 'urgente', 'evento'],
      default: 'info',
    },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
  },
  { timestamps: true }
);

NoticeSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<INotice>('Notice', NoticeSchema);
