import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
  departmentId: mongoose.Types.ObjectId;
  financialYear: string;
  category: string;
  allocatedAmount: number;
  description: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  createdBy?: mongoose.Types.ObjectId;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    financialYear: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'CLOSED', 'DRAFT'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

budgetSchema.index({ departmentId: 1, financialYear: 1, category: 1 }, { unique: true });

export default mongoose.model<IBudget>('Budget', budgetSchema);
