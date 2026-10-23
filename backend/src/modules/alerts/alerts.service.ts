import Alert from '../../models/Alert';
import { ApiError } from '../../utils/response';

export class AlertsService {
  async list(query: any, user?: any) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.type) filter.type = query.type;
    if (query.search) filter.$or = [
      { message: new RegExp(query.search, 'i') },
      { explanation: new RegExp(query.search, 'i') },
    ];
    if (user?.role === 'DEPARTMENT_HEAD' && user.departmentId) filter.departmentId = user.departmentId;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const [items, total] = await Promise.all([
      Alert.find(filter).populate('departmentId', 'name code').populate('budgetId', 'category financialYear')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Alert.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async getById(id: string, user?: any) {
    const alert = await Alert.findById(id)
      .populate('departmentId', 'name code').populate('budgetId', 'category financialYear allocatedAmount')
      .populate('expenditureId', 'amount date vendor invoiceNumber description')
      .populate('resolvedBy', 'name');
    if (!alert) throw new ApiError('Alert not found.', 404);
    if (user?.role === 'DEPARTMENT_HEAD'
      && alert.departmentId && String(user.departmentId) !== String((alert.departmentId as any)._id)) {
      throw new ApiError('Insufficient permission to view this alert.', 403);
    }
    return alert;
  }

  async resolve(id: string, user: any, note?: string) {
    const alert = await Alert.findById(id);
    if (!alert) throw new ApiError('Alert not found.', 404);
    if (user.role === 'DEPARTMENT_HEAD'
      && alert.departmentId && String(user.departmentId) !== String(alert.departmentId)) {
      throw new ApiError('Insufficient permission to resolve this alert.', 403);
    }
    if (alert.status === 'RESOLVED') throw new ApiError('This alert has already been resolved.', 400);
    alert.status = 'RESOLVED';
    alert.resolvedBy = user._id;
    alert.resolvedAt = new Date();
    if (note) alert.recommendedAction = `${alert.recommendedAction} | Resolution note: ${note}`;
    await alert.save();
    return alert;
  }
}
