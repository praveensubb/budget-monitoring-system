import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  action: string;
  entity: string;
  entityId?: any;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: 'System' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed, default: null },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
