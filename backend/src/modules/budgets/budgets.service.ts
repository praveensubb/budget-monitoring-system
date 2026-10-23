import Budget from '../../models/Budget';
import Department from '../../models/Department';
import Expenditure from '../../models/Expenditure';
import { ApiError } from '../../utils/response';
import { computeBudgetStats } from '../../utils/calculation';

export class BudgetsService {
  /** Attach computed utilization to a list of budgets. */
  private async withStats(budgets: any[]) {
    if (!budgets.length) return [];
    const ids = budgets.map(b => b._id);
    const agg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: ids }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const map = new Map(agg.map(a => [String(a._id), a.total]));
    return budgets.map(b => {
      const obj = b.toObject ? b.toObject() : b;
      const stats = computeBudgetStats(b.allocatedAmount, map.get(String(b._id)) || 0);
      return { ...obj, ...stats };
    });
  }

  async list(query: any, user?: any) {
    const filter: any = {};
    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.financialYear) filter.financialYear = query.financialYear;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { category: new RegExp(query.search, 'i') },
        { description: new RegExp(query.search, 'i') },
      ];
    }
    // Department heads only see their own department budgets
    if (user && user.role === 'DEPARTMENT_HEAD' && user.departmentId) {
      filter.departmentId = user.departmentId;
    }
    const budgets = await Budget.find(filter)
      .populate('departmentId', 'name code')
      .populate('createdBy', 'name')
      .sort({ financialYear: -1, createdAt: -1 });
    return this.withStats(budgets);
  }

  async getById(id: string, user?: any) {
    const budget = await Budget.findById(id).populate('departmentId', 'name code').populate('createdBy', 'name');
    if (!budget) throw new ApiError('Budget not found.', 404);
    if (user && user.role === 'DEPARTMENT_HEAD'
      && String(user.departmentId) !== String((budget as any).departmentId._id ?? (budget as any).departmentId)) {
      throw new ApiError('Insufficient permission to view this budget.', 403);
    }
    const [withStats] = await this.withStats([budget]);
    const expenditures = await Expenditure.find({ budgetId: id }).populate('createdBy', 'name').sort({ date: -1 });
    return { ...withStats, expenditures };
  }

  async create(data: any, userId: string) {
    const dept = await Department.findById(data.departmentId);
    if (!dept) throw new ApiError('Selected department does not exist.', 400);
    if (Number(data.allocatedAmount) <= 0) throw new ApiError('Allocated amount must be greater than zero.', 400);
    const clash = await Budget.findOne({
      departmentId: data.departmentId,
      financialYear: data.financialYear,
      category: data.category,
    });
    if (clash) throw new ApiError('A budget already exists for this department, financial year and category.', 409);
    return Budget.create({
      departmentId: data.departmentId,
      financialYear: data.financialYear,
      category: data.category,
      allocatedAmount: Number(data.allocatedAmount),
      description: data.description || '',
      status: data.status || 'ACTIVE',
      createdBy: userId,
      approvedBy: data.approvedBy || '',
    });
  }

  async update(id: string, data: any, user?: any) {
    const budget = await Budget.findById(id);
    if (!budget) throw new ApiError('Budget not found.', 404);
    if (user && user.role === 'DEPARTMENT_HEAD') {
      throw new ApiError('Department heads cannot modify budgets.', 403);
    }
    if (data.allocatedAmount !== undefined) {
      const amt = Number(data.allocatedAmount);
      if (amt <= 0) throw new ApiError('Allocated amount must be greater than zero.', 400);
      budget.allocatedAmount = amt;
    }
    if (data.financialYear) budget.financialYear = data.financialYear;
    if (data.category) budget.category = data.category;
    if (data.description !== undefined) budget.description = data.description;
    if (data.status) budget.status = data.status;
    if (data.approvedBy !== undefined) budget.approvedBy = data.approvedBy;
    await budget.save();
    return budget;
  }

  async remove(id: string, user?: any) {
    if (user && user.role === 'DEPARTMENT_HEAD') {
      throw new ApiError('Department heads cannot delete budgets.', 403);
    }
    const count = await Expenditure.countDocuments({ budgetId: id });
    if (count > 0) throw new ApiError('Cannot delete budget: expenditures are recorded against it.', 400);
    const budget = await Budget.findByIdAndDelete(id);
    if (!budget) throw new ApiError('Budget not found.', 404);
    return { deleted: true };
  }
}
