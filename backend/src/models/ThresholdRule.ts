import mongoose, { Schema, Document } from 'mongoose';

export interface IThresholdRule extends Document {
  key: string;
  name: string;
  type: string;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const thresholdRuleSchema = new Schema<IThresholdRule>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    threshold: { type: Number, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IThresholdRule>('ThresholdRule', thresholdRuleSchema);
