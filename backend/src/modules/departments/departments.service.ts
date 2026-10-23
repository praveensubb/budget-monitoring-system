import Department from '../../models/Department';
import Budget from '../../models/Budget';
import { ApiError } from '../../utils/response';
import { computeBudgetStats } from '../../utils/calculation';

export class DepartmentsService {
  async list(query: any) {
    const filter: any = {};
    if (query.search) filter.$or = [
      { name: new RegExp(query.search, 'i') },
      { code: new RegExp(query.search, 'i') },
      { head: new RegExp(query.search, 'i') },
    ];
    if (query.status) filter.status = query.status;
    return Department.find(filter).sort({ name: 1 });
  }

  async getById(id: string) {
    const dept = await Department.findById(id);
    if (!dept) throw new ApiError('Department not found.', 404);
    return dept;
  }

  async create(data: any) {
    const existing = await Department.findOne({ $or: [{ name: data.name }, { code: data.code.toUpperCase() }] });
    if (existing) throw new ApiError('A department with this name or code already exists.', 409);
    return Department.create({
      name: data.name,
      code: data.code.toUpperCase(),
      head: data.head,
      description: data.description || '',
      status: data.status || 'ACTIVE',
    });
  }

  async update(id: string, data: any) {
    const dept = await Department.findById(id);
    if (!dept) throw new ApiError('Department not found.', 404);
    if (data.name && data.name !== dept.name) {
      const clash = await Department.findOne({ name: data.name });
      if (clash) throw new ApiError('A department with this name already exists.', 409);
      dept.name = data.name;
    }
    if (data.code) dept.code = String(data.code).toUpperCase();
    if (data.head) dept.head = data.head;
    if (data.description !== undefined) dept.description = data.description;
    if (data.status) dept.status = data.status;
    await dept.save();
    return dept;
  }

  async remove(id: string) {
    const budgetCount = await Budget.countDocuments({ departmentId: id });
    if (budgetCount > 0) throw new ApiError('Cannot delete department: budgets are assigned to it.', 400);
    const dept = await Department.findByIdAndDelete(id);
    if (!dept) throw new ApiError('Department not found.', 404);
    return { deleted: true };
  }

  /** Budget + expenditure summary for one department (used by dashboards). */
  async utilization(id: string, financialYear?: string) {
    const dept = await this.getById(id);
    const budgetFilter: any = { departmentId: id };
    if (financialYear) budgetFilter.financialYear = financialYear;
    const budgets = await Budget.find(budgetFilter);
    const budgetIds = budgets.map(b => b._id);
    const Expenditure = (await import('../../models/Expenditure')).default;
    const spentAgg = await Expenditure.aggregate([
      { $match: { budgetId: { $in: budgetIds }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$budgetId', total: { $sum: '$amount' } } },
    ]);
    const spentMap = new Map(spentAgg.map(s => [String(s._id), s.total]));
    let allocated = 0, spent = 0;
    for (const b of budgets) {
      allocated += b.allocatedAmount;
      spent += spentMap.get(String(b._id)) || 0;
    }
    return { department: dept, ...computeBudgetStats(allocated, spent), budgetCount: budgets.length };
  }
}
