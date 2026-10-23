import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  type: string;
  departmentId?: mongoose.Types.ObjectId;
  budgetId?: mongoose.Types.ObjectId;
  expenditureId?: mongoose.Types.ObjectId;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  explanation: string;
  recommendedAction: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    type: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    budgetId: { type: Schema.Types.ObjectId, ref: 'Budget', default: null },
    expenditureId: { type: Schema.Types.ObjectId, ref: 'Expenditure', default: null },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    message: { type: String, required: true },
    explanation: { type: String, default: '' },
    recommendedAction: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ type: 1, budgetId: 1, status: 1 });

export default mongoose.model<IAlert>('Alert', alertSchema);
