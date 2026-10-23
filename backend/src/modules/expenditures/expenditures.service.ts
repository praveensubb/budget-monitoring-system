import Expenditure from '../../models/Expenditure';
import Budget from '../../models/Budget';
import { ApiError } from '../../utils/response';
import { computeBudgetStats, formatINR } from '../../utils/calculation';
import { evaluateBudgetAnomalies } from '../monitoring/anomaly.service';

export class ExpendituresService {
  async totalSpentForBudget(budgetId: string, excludeId?: string) {
    const match: any = { budgetId, status: { $ne: 'CANCELLED' } };
    if (excludeId) match._id = { $ne: excludeId };
    const agg = await Expenditure.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return agg.length ? agg[0].total : 0;
  }

  async list(query: any, user?: any) {
    const filter: any = {};
    if (query.budgetId) filter.budgetId = query.budgetId;
    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { description: new RegExp(query.search, 'i') },
        { vendor: new RegExp(query.search, 'i') },
        { invoiceNumber: new RegExp(query.search, 'i') },
      ];
    }
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) filter.date.$lte = new Date(new Date(query.to).setHours(23, 59, 59, 999));
    }
    if (user && user.role === 'DEPARTMENT_HEAD' && user.departmentId) {
      filter.departmentId = user.departmentId;
    }
    const sortField = ['amount', 'date', 'createdAt'].includes(query.sortBy) ? query.sortBy : 'date';
    const sortDir = query.sortDir === 'asc' ? 1 : -1;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const [items, total] = await Promise.all([
      Expenditure.find(filter)
        .populate('budgetId', 'category financialYear allocatedAmount')
        .populate('departmentId', 'name code')
        .populate('createdBy', 'name')
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit).limit(limit),
      Expenditure.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async getById(id: string, user?: any) {
    const exp = await Expenditure.findById(id)
      .populate('budgetId', 'category financialYear allocatedAmount')
      .populate('departmentId', 'name code').populate('createdBy', 'name');
    if (!exp) throw new ApiError('Expenditure not found.', 404);
    if (user && user.role === 'DEPARTMENT_HEAD'
      && String(user.departmentId) !== String((exp as any).departmentId._id ?? (exp as any).departmentId)) {
      throw new ApiError('Insufficient permission to view this expenditure.', 403);
    }
    return exp;
  }

  async validateAndPrepare(data: any, user?: any, excludeId?: string) {
    const budget = await Budget.findById(data.budgetId).populate('departmentId', 'name');
    if (!budget) throw new ApiError('The selected budget does not exist.', 400);
    const budgetDeptId = String((budget as any).departmentId._id ?? budget.departmentId);
    if (String(data.departmentId) !== budgetDeptId) {
      throw new ApiError('The selected budget does not belong to this department.', 400);
    }
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) throw new ApiError('Expenditure amount must be greater than zero.', 400);
    if (user && user.role === 'DEPARTMENT_HEAD' && String(user.departmentId) !== budgetDeptId) {
      throw new ApiError('You can only record expenditure for your own department.', 403);
    }
    const spent = await this.totalSpentForBudget(String(budget._id), excludeId);
    const stats = computeBudgetStats(budget.allocatedAmount, spent + amount);
    if (stats.remaining < 0) {
      throw new ApiError(
        `This expenditure of ${formatINR(amount)} would exceed the allocated budget. ` +
        `Remaining budget: ${formatINR(budget.allocatedAmount - spent)}.`, 400
      );
    }
    return { budget, amount, stats };
  }

  async create(data: any, user?: any) {
    const { budget, amount } = await this.validateAndPrepare(data, user);
    const expenditure = await Expenditure.create({
      budgetId: budget._id,
      departmentId: budget.departmentId,
      amount,
      date: new Date(data.date),
      description: data.description,
      vendor: data.vendor || '',
      invoiceNumber: data.invoiceNumber || '',
      category: data.category,
      status: data.status || 'RECORDED',
      createdBy: user ? user._id : null,
    });
    await evaluateBudgetAnomalies(String(budget._id), expenditure._id);
    return this.getById(String(expenditure._id), user && { ...user, role: 'ADMIN' });
  }

  async update(id: string, data: any, user?: any) {
    const existing = await Expenditure.findById(id);
    if (!existing) throw new ApiError('Expenditure not found.', 404);
    await this.validateAndPrepare({ ...existing.toObject(), ...data }, user, id);
    existing.amount = Number(data.amount ?? existing.amount);
    if (data.date) existing.date = new Date(data.date);
    if (data.description) existing.description = data.description;
    if (data.vendor !== undefined) existing.vendor = data.vendor;
    if (data.invoiceNumber !== undefined) existing.invoiceNumber = data.invoiceNumber;
    if (data.category) existing.category = data.category;
    if (data.status) existing.status = data.status;
    await existing.save();
    await evaluateBudgetAnomalies(String(existing.budgetId), existing._id);
    return this.getById(id);
  }

  async remove(id: string, user?: any) {
    if (user && user.role === 'DEPARTMENT_HEAD') {
      throw new ApiError('Department heads cannot delete expenditures.', 403);
    }
    const exp = await Expenditure.findByIdAndDelete(id);
    if (!exp) throw new ApiError('Expenditure not found.', 404);
    return { deleted: true };
  }
}
