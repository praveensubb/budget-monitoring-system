import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'FINANCE_OFFICER' | 'DEPARTMENT_HEAD';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  departmentId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'], required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
