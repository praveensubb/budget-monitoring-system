import Budget from '../../models/Budget';
import Expenditure from '../../models/Expenditure';
import Alert from '../../models/Alert';
import Department from '../../models/Department';
import { computeBudgetStats } from '../../utils/calculation';
import { evaluateAllBudgets } from './anomaly.service';

export class MonitoringService {
  async summary(user?: any) {
    const deptFilter: any = {};
    if (user?.role === 'DEPARTMENT_HEAD' && user.departmentId) deptFilter._id = user.departmentId;
    const departments = await Department.find(deptFilter);
    const deptIds = departments.map(d => d._id);
    const budgets = await Budget.find({ departmentId: { $in: deptIds }, status: { $ne: 'CLOSED' } });
    const budgetIds = budgets.map(b => b._id);
    const spentAgg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: budgetIds }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(spentAgg.map(s => [String(s._id), s.total]));
    let totalBudget = 0, totalSpent = 0;
    const deptRows = departments.map(d => ({ department: d, allocated: 0, spent: 0 }));
    const idx = new Map(deptRows.map((r, i) => [String(r.department._id), i]));
    for (const b of budgets) {
      const spent = spentMap.get(String(b._id)) || 0;
      totalBudget += b.allocatedAmount;
      totalSpent += spent;
      const i = idx.get(String(b.departmentId));
      if (i !== undefined) { deptRows[i].allocated += b.allocatedAmount; deptRows[i].spent += spent; }
    }
    const overall = computeBudgetStats(totalBudget, totalSpent);
    const alertFilter: any = { status: 'OPEN' };
    if (user?.role === 'DEPARTMENT_HEAD' && user.departmentId) alertFilter.departmentId = user.departmentId;
    const [activeAlerts, highRiskTx, recentAlerts] = await Promise.all([
      Alert.countDocuments(alertFilter),
      Alert.countDocuments({ ...alertFilter, severity: { $in: ['HIGH', 'CRITICAL'] } }),
      Alert.find(alertFilter).populate('departmentId', 'name').sort({ createdAt: -1 }).limit(8),
    ]);
    // Monthly expenditure trend (last 12 months)
    const trend = await Expenditure.aggregate([
      { $match: { budgetId: { $in: budgetIds }, status: { $ne: 'CANCELLED' }, date: { $gte: new Date(Date.now() - 365 * 24 * 3600 * 1000) } } },
      { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);
    const alertDist = await Alert.aggregate([{ $match: alertFilter }, { $group: { _id: '$severity', count: { $sum: 1 } } }]);
    return {
      overall,
      departments: deptRows.map(r => ({ department: r.department, ...computeBudgetStats(r.allocated, r.spent) })),
      activeAlerts, highRiskTx, recentAlerts,
      monthlyTrend: trend.map(t => ({ month: `${t._id.y}-${String(t._id.m).padStart(2, '0')}`, total: t.total })),
      alertDistribution: alertDist,
    };
  }

  async departmentUtilization(financialYear?: string, user?: any) {
    const deptFilter: any = {};
    if (user?.role === 'DEPARTMENT_HEAD' && user.departmentId) deptFilter._id = user.departmentId;
    const departments = await Department.find(deptFilter);
    const budgetFilter: any = { status: { $ne: 'CLOSED' } };
    if (financialYear) budgetFilter.financialYear = financialYear;
    const budgets = await Budget.find(budgetFilter);
    const budgetIds = budgets.map(b => b._id);
    const spentAgg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: budgetIds }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(spentAgg.map(s => [String(s._id), s.total]));
    const rows = departments.map(d => ({ department: d, allocated: 0, spent: 0, budgets: 0 }));
    const idx = new Map(rows.map((r, i) => [String(r.department._id), i]));
    for (const b of budgets) {
      const i = idx.get(String(b.departmentId));
      if (i === undefined) continue;
      rows[i].allocated += b.allocatedAmount;
      rows[i].spent += spentMap.get(String(b._id)) || 0;
      rows[i].budgets += 1;
    }
    return rows.map(r => ({ department: r.department, budgetCount: r.budgets, ...computeBudgetStats(r.allocated, r.spent) }));
  }

  async anomalies(user?: any) {
    await evaluateAllBudgets(); // ensure fresh evaluation
    const filter: any = {};
    if (user?.role === 'DEPARTMENT_HEAD' && user.departmentId) filter.departmentId = user.departmentId;
    const alerts = await Alert.find({
      ...filter,
      type: { $in: ['CRITICAL_UTILIZATION', 'HIGH_RISK_UTILIZATION', 'UTILIZATION_WARNING', 'LARGE_TRANSACTION', 'SUSPICIOUS_SPENDING', 'UNDER_UTILIZATION', 'OVER_BUDGET'] },
    }).populate('departmentId', 'name').populate('budgetId', 'category financialYear allocatedAmount')
      .populate('expenditureId', 'amount date vendor invoiceNumber')
      .sort({ createdAt: -1 });
    return alerts;
  }

  async underUtilized(user?: any) {
    const rows = await this.departmentUtilization(undefined, user);
    const rules = (await import('../../models/ThresholdRule')).default;
    const uu = await rules.findOne({ key: 'underUtilization' });
    const threshold = uu?.enabled ? uu.threshold : 25;
    return rows
      .filter(r => r.allocated > 0 && r.utilization < threshold)
      .map(r => ({ ...r, explanation: `Utilization ${r.utilization.toFixed(1)}% is below the ${threshold}% threshold.`, recommendedAction: 'Review pending procurement and planned activities.' }));
  }

  async highValueTransactions(limit = 10, user?: any) {
    const deptFilter: any = {};
    if (user?.role === 'DEPARTMENT_HEAD' && user.departmentId) deptFilter.departmentId = user.departmentId;
    const budgets = await Budget.find({});
    const budgetIds = budgets.map(b => b._id);
    const items = await Expenditure.find({ budgetId: { $in: budgetIds }, status: { $ne: 'CANCELLED' }, ...deptFilter })
      .populate('budgetId', 'category allocatedAmount financialYear')
      .populate('departmentId', 'name')
      .sort({ amount: -1 }).limit(limit);
    return items.map((e: any) => {
      const pct = e.budgetId ? (e.amount / e.budgetId.allocatedAmount) * 100 : 0;
      return { ...e.toObject(), budgetPct: pct };
    });
  }
}
