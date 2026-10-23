import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  head: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    head: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model<IDepartment>('Department', departmentSchema);
