import Budget from '../../models/Budget';
import Expenditure from '../../models/Expenditure';
import Alert from '../../models/Alert';
import Department from '../../models/Department';
import AuditLog from '../../models/AuditLog';
import { computeBudgetStats } from '../../utils/calculation';

function buildDateFilter(query: any) {
  const filter: any = {};
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = new Date(query.from);
    if (query.to) filter.date.$lte = new Date(new Date(query.to).setHours(23, 59, 59, 999));
  }
  if (query.departmentId) filter.departmentId = query.departmentId;
  return filter;
}

export class ReportsService {
  async summary(query: any) {
    const budgets = await Budget.find(query.financialYear ? { financialYear: query.financialYear } : {});
    const budgetIds = budgets.map(b => b._id);
    const dateFilter = buildDateFilter(query);
    const agg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: budgetIds }, status: { $ne: 'CANCELLED' }, ...dateFilter } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(agg.map(a => [String(a._id), a.total]));
    let allocated = 0, spent = 0;
    for (const b of budgets) { allocated += b.allocatedAmount; spent += spentMap.get(String(b._id)) || 0; }
    const [deptCount, alertCount, expCount] = await Promise.all([
      Department.countDocuments({ status: 'ACTIVE' }),
      Alert.countDocuments({}),
      Expenditure.countDocuments({ status: { $ne: 'CANCELLED' } }),
    ]);
    return { ...computeBudgetStats(allocated, spent), departments: deptCount, alerts: alertCount, expenditures: expCount };
  }

  async budgetsReport(query: any) {
    const filter: any = {};
    if (query.financialYear) filter.financialYear = query.financialYear;
    if (query.departmentId) filter.departmentId = query.departmentId;
    const budgets = await Budget.find(filter).populate('departmentId', 'name code').sort({ departmentId: 1 });
    const ids = budgets.map(b => b._id);
    const agg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: ids }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(agg.map(a => [String(a._id), a.total]));
    return budgets.map(b => ({
      budget: b,
      ...computeBudgetStats(b.allocatedAmount, spentMap.get(String(b._id)) || 0),
    }));
  }

  async expendituresReport(query: any) {
    const filter: any = { status: { $ne: 'CANCELLED' }, ...buildDateFilter(query) };
    if (query.financialYear) {
      const budgets = await Budget.find({ financialYear: query.financialYear });
      filter.budgetId = { $in: budgets.map(b => b._id) };
    }
    const items = await Expenditure.find(filter)
      .populate('budgetId', 'category financialYear')
      .populate('departmentId', 'name code')
      .sort({ date: -1 });
    // Category-wise totals for charting
    const byCategory = await Expenditure.aggregate([
      { $match: filter }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    // Monthly trend
    const monthly = await Expenditure.aggregate([
      { $match: filter },
      { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);
    return {
      items,
      byCategory: byCategory.map(c => ({ category: c._id, total: c.total, count: c.count })),
      monthly: monthly.map(m => ({ month: `${m._id.y}-${String(m._id.m).padStart(2, '0')}`, total: m.total })),
    };
  }

  async utilizationReport(query: any) {
    const budgets = await Budget.find(query.financialYear ? { financialYear: query.financialYear } : {}).populate('departmentId', 'name code');
    const ids = budgets.map(b => b._id);
    const agg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: ids }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(agg.map(a => [String(a._id), a.total]));
    return budgets.map(b => ({
      budget: b,
      department: b.departmentId,
      ...computeBudgetStats(b.allocatedAmount, spentMap.get(String(b._id)) || 0),
    }));
  }

  async alertsReport(query: any) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.departmentId) filter.departmentId = query.departmentId;
    const items = await Alert.find(filter).populate('departmentId', 'name code').sort({ createdAt: -1 });
    const byType = await Alert.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }]);
    const bySeverity = await Alert.aggregate([{ $match: filter }, { $group: { _id: '$severity', count: { $sum: 1 } } }]);
    return { items, byType, bySeverity };
  }

  async auditReport(query: any) {
    const filter: any = {};
    if (query.userId) filter.userId = query.userId;
    if (query.action) filter.action = query.action;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) filter.createdAt.$lte = new Date(new Date(query.to).setHours(23, 59, 59, 999));
    }
    return AuditLog.find(filter).populate('userId', 'name email').sort({ createdAt: -1 }).limit(500);
  }
}
