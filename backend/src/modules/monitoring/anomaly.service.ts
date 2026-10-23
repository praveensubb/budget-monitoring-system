import Budget from '../../models/Budget';
import Expenditure from '../../models/Expenditure';
import Alert from '../../models/Alert';
import ThresholdRule from '../../models/ThresholdRule';
import { computeBudgetStats, formatINR } from '../../utils/calculation';

const DEFAULT_RULES: Record<string, { key: string; name: string; type: string; threshold: number; severity: any; description: string }> = {
  warning: { key: 'warning', name: 'Utilization Warning', type: 'UTILIZATION', threshold: 75, severity: 'MEDIUM', description: 'Flag when budget utilization crosses the warning threshold.' },
  highRisk: { key: 'highRisk', name: 'High Risk Utilization', type: 'UTILIZATION', threshold: 90, severity: 'HIGH', description: 'Flag when budget utilization crosses the high-risk threshold.' },
  critical: { key: 'critical', name: 'Critical / Over Budget', type: 'UTILIZATION', threshold: 100, severity: 'CRITICAL', description: 'Flag when budget utilization reaches or exceeds 100%.' },
  largeTransaction: { key: 'largeTransaction', name: 'Large Transaction', type: 'TRANSACTION', threshold: 25, severity: 'HIGH', description: 'Flag a single expenditure greater than this % of its allocated budget.' },
  underUtilization: { key: 'underUtilization', name: 'Under-utilization', type: 'UNDER_UTILIZATION', threshold: 25, severity: 'MEDIUM', description: 'Flag budgets below this % utilization near the end of the financial period.' },
};

export async function getRules() {
  const rules = await ThresholdRule.find({});
  const map: Record<string, any> = {};
  for (const r of rules) map[r.key] = r;
  // Fill with defaults for any missing rule
  for (const [k, def] of Object.entries(DEFAULT_RULES)) {
    if (!map[k]) map[k] = { ...def, enabled: true };
  }
  return map;
}

async function createAlertIfNew(payload: any) {
  const existing = await Alert.findOne({
    type: payload.type,
    budgetId: payload.budgetId,
    status: 'OPEN',
  });
  if (existing) return null;
  return Alert.create(payload);
}

/**
 * Rule-based analytical anomaly detection (Phase 1).
 * Evaluates all monitoring rules for one budget and persists alerts.
 */
export async function evaluateBudgetAnomalies(budgetId: string, newExpenditureId?: any) {
  const budget = await Budget.findById(budgetId).populate('departmentId', 'name');
  if (!budget) return [];
  const rules = await getRules();
  const dept: any = budget.departmentId;
  const deptName = dept?.name ?? 'Department';
  const expenses = await Expenditure.find({ budgetId, status: { $ne: 'CANCELLED' } }).sort({ date: 1 });
  const stats = computeBudgetStats(budget.allocatedAmount, expenses.reduce((s, e) => s + e.amount, 0));
  const created: any[] = [];
  const base = {
    departmentId: dept?._id ?? null,
    budgetId: budget._id,
    expenditureId: newExpenditureId ?? null,
  };

  // RULE 1-3: utilization thresholds
  const utilRules = [
    { key: 'critical', type: 'CRITICAL_UTILIZATION', cond: stats.utilization >= 100,
      msg: `Budget over-utilized: ${stats.utilization.toFixed(1)}% of ${budget.category} budget consumed.`,
      expl: `Total expenditure ${formatINR(stats.totalSpent)} has reached/exceeded the allocated budget of ${formatINR(stats.allocated)} (${stats.utilization.toFixed(1)}%).`,
      action: 'Freeze further spending on this budget and investigate immediately.' },
    { key: 'highRisk', type: 'HIGH_RISK_UTILIZATION', cond: stats.utilization >= 90 && stats.utilization < 100,
      msg: `Budget utilization crossed the ${rules.highRisk.threshold}% high-risk threshold.`,
      expl: `Budget utilization has reached ${stats.utilization.toFixed(1)}%, crossing the configured high-risk threshold of ${rules.highRisk.threshold}%.`,
      action: 'Review pending expenditure and obtain approval before further commitments.' },
    { key: 'warning', type: 'UTILIZATION_WARNING', cond: stats.utilization >= 75 && stats.utilization < 90,
      msg: `Budget utilization crossed the ${rules.warning.threshold}% warning threshold.`,
      expl: `Budget utilization has reached ${stats.utilization.toFixed(1)}%, crossing the configured warning threshold of ${rules.warning.threshold}%.`,
      action: 'Monitor spending closely for the remainder of the financial period.' },
  ];
  for (const r of utilRules) {
    const rule = rules[r.key];
    if (rule?.enabled && r.cond) {
      const alert = await createAlertIfNew({ ...base, type: r.type, severity: rule.severity, message: `[${deptName}] ${r.msg}`, explanation: r.expl, recommendedAction: r.action });
      if (alert) created.push(alert);
    }
  }

  // RULE 4: large single transaction
  const ltRule = rules.largeTransaction;
  if (ltRule?.enabled) {
    for (const exp of expenses) {
      const pct = (exp.amount / budget.allocatedAmount) * 100;
      if (pct > ltRule.threshold) {
        const alert = await createAlertIfNew({
          ...base, expenditureId: exp._id, type: 'LARGE_TRANSACTION', severity: ltRule.severity,
          message: `[${deptName}] Large transaction detected: ${formatINR(exp.amount)} (${pct.toFixed(1)}% of budget).`,
          explanation: `${formatINR(exp.amount)} expenditure was flagged because it represents ${pct.toFixed(1)}% of the allocated ${budget.category} budget, exceeding the ${ltRule.threshold}% large-transaction threshold.`,
          recommendedAction: 'Verify invoice, vendor legitimacy and procurement approval for this transaction.',
        });
        if (alert) created.push(alert);
      }
    }
  }

  // RULE 5: multiple high-value transactions within a short period (7 days)
  const HIGH_VALUE_PCT = 10;
  const WINDOW_DAYS = 7;
  const highValue = expenses.filter(e => (e.amount / budget.allocatedAmount) * 100 >= HIGH_VALUE_PCT);
  for (let i = 0; i < highValue.length; i++) {
    const windowStart = new Date(highValue[i].date);
    const cluster = highValue.filter(e => {
      const diff = (new Date(e.date).getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= WINDOW_DAYS;
    });
    if (cluster.length >= 3) {
      const total = cluster.reduce((s, e) => s + e.amount, 0);
      const alert = await createAlertIfNew({
        ...base, type: 'SUSPICIOUS_SPENDING', severity: 'HIGH',
        message: `[${deptName}] Suspicious spending: ${cluster.length} high-value transactions within ${WINDOW_DAYS} days.`,
        explanation: `${cluster.length} transactions each exceeding ${HIGH_VALUE_PCT}% of the budget occurred within a ${WINDOW_DAYS}-day window, totalling ${formatINR(total)}. This pattern is unusual and warrants review.`,
        recommendedAction: 'Audit the clustered transactions and confirm they are legitimate and properly approved.',
      });
      if (alert) created.push(alert);
      break;
    }
  }

  // RULE 6: under-utilization near end of financial period
  const uuRule = rules.underUtilization;
  if (uuRule?.enabled) {
    const endOfFY = financialYearEnd(budget.financialYear);
    const daysLeft = (endOfFY.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 90 && daysLeft >= -30 && stats.utilization < uuRule.threshold && expenses.length > 0) {
      const alert = await createAlertIfNew({
        ...base, type: 'UNDER_UTILIZATION', severity: uuRule.severity,
        message: `[${deptName}] ${budget.category} budget under-utilized: only ${stats.utilization.toFixed(1)}% used.`,
        explanation: `With approximately ${Math.max(0, Math.round(daysLeft))} days remaining in ${budget.financialYear}, utilization is ${stats.utilization.toFixed(1)}%, below the ${uuRule.threshold}% minimum expected threshold.`,
        recommendedAction: 'Review pending procurement and planned activities to improve fund utilization.',
      });
      if (alert) created.push(alert);
    }
  }

  return created;
}

function financialYearEnd(fy: string): Date {
  // Expects "2025-26" -> ends 31 March 2026
  const startYear = parseInt(fy.split('-')[0], 10);
  return new Date(startYear + 1, 2, 31);
}

/** Re-evaluate every budget (used by monitoring pages and seed). */
export async function evaluateAllBudgets() {
  const budgets = await Budget.find({ status: 'ACTIVE' });
  let count = 0;
  for (const b of budgets) {
    const created = await evaluateBudgetAnomalies(String(b._id));
    count += created.length;
  }
  return count;
}
