import ThresholdRule from '../../models/ThresholdRule';
import { ApiError } from '../../utils/response';

export const DEFAULT_RULES = [
  { key: 'warning', name: 'Utilization Warning', type: 'UTILIZATION', threshold: 75, severity: 'MEDIUM', description: 'Alert when budget utilization crosses this warning percentage.' },
  { key: 'highRisk', name: 'High Risk Utilization', type: 'UTILIZATION', threshold: 90, severity: 'HIGH', description: 'Alert when budget utilization crosses this high-risk percentage.' },
  { key: 'critical', name: 'Critical / Over Budget', type: 'UTILIZATION', threshold: 100, severity: 'CRITICAL', description: 'Alert when budget utilization reaches or exceeds 100%.' },
  { key: 'largeTransaction', name: 'Large Transaction', type: 'TRANSACTION', threshold: 25, severity: 'HIGH', description: 'Flag a single expenditure greater than this % of the allocated budget.' },
  { key: 'underUtilization', name: 'Under-utilization', type: 'UNDER_UTILIZATION', threshold: 25, severity: 'MEDIUM', description: 'Flag budgets below this % utilization near financial period end.' },
];

export class RulesService {
  async list() { return ThresholdRule.find({}).sort({ createdAt: 1 }); }

  async seedDefaults() {
    for (const def of DEFAULT_RULES) {
      await ThresholdRule.updateOne({ key: def.key }, { $setOnInsert: def }, { upsert: true });
    }
  }

  async update(id: string, data: any) {
    const rule = await ThresholdRule.findById(id);
    if (!rule) throw new ApiError('Rule not found.', 404);
    if (data.threshold !== undefined) {
      const t = Number(data.threshold);
      if (isNaN(t) || t < 0 || t > 100) throw new ApiError('Threshold must be a number between 0 and 100.', 400);
      rule.threshold = t;
    }
    if (data.enabled !== undefined) rule.enabled = Boolean(data.enabled);
    if (data.name) rule.name = data.name;
    if (data.description !== undefined) rule.description = data.description;
    await rule.save();
    return rule;
  }

  async remove(id: string) {
    const rule = await ThresholdRule.findById(id);
    if (!rule) throw new ApiError('Rule not found.', 404);
    if (DEFAULT_RULES.some(d => d.key === rule.key)) {
      throw new ApiError('Default monitoring rules cannot be deleted; disable them instead.', 400);
    }
    await ThresholdRule.findByIdAndDelete(id);
    return { deleted: true };
  }
}
