import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenditure extends Document {
  budgetId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  description: string;
  vendor: string;
  invoiceNumber: string;
  category: string;
  status: 'RECORDED' | 'VERIFIED' | 'CANCELLED';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenditureSchema = new Schema<IExpenditure>(
  {
    budgetId: { type: Schema.Types.ObjectId, ref: 'Budget', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    vendor: { type: String, default: '' },
    invoiceNumber: { type: String, default: '' },
    category: { type: String, required: true, trim: true },
    status: { type: String, enum: ['RECORDED', 'VERIFIED', 'CANCELLED'], default: 'RECORDED' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IExpenditure>('Expenditure', expenditureSchema);
