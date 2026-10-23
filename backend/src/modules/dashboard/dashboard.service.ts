import User from '../../models/User';
import Department from '../../models/Department';
import Alert from '../../models/Alert';
import Expenditure from '../../models/Expenditure';
import { MonitoringService } from '../monitoring/monitoring.service';

const monitoring = new MonitoringService();

export class DashboardService {
  async admin() {
    const [monitor, users, alertsBySeverity, highValue] = await Promise.all([
      monitoring.summary(),
      User.countDocuments({ status: 'ACTIVE' }),
      Alert.aggregate([{ $match: { status: 'OPEN' } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      monitoring.highValueTransactions(5),
    ]);
    const underUtilized = monitor.departments.filter(d => d.allocated > 0 && d.utilization < 25);
    return {
      ...monitor,
      users,
      departmentsCount: monitor.departments.length,
      alertsBySeverity,
      highValueTransactions: highValue,
      underUtilizedCount: underUtilized.length,
    };
  }

  async finance() {
    const monitor = await monitoring.summary();
    const recentExpenditures = await Expenditure.find({ status: { $ne: 'CANCELLED' } })
      .populate('departmentId', 'name code').populate('budgetId', 'category')
      .sort({ date: -1 }).limit(10);
    return { ...monitor, recentExpenditures };
  }

  async departmentHead(user: any) {
    const deptId = user.departmentId;
    const monitor = await monitoring.summary(user);
    const recentExpenditures = deptId
      ? await Expenditure.find({ departmentId: deptId, status: { $ne: 'CANCELLED' } })
          .populate('budgetId', 'category').sort({ date: -1 }).limit(10)
      : [];
    return {
      ...monitor,
      recentExpenditures,
      department: deptId
        ? await Department.findById(deptId).select('name code head')
        : null,
    };
  }
}
