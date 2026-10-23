import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new ReportsService();

const wrap = (fn: (q: any) => Promise<any>, name: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fn(req.query);
      await createAuditLog(req, 'GENERATE_REPORT', 'Report', name, `${name} report generated.`);
      return sendSuccess(res, `${name} report generated.`, data);
    } catch (e) { next(e); }
  };

export const getSummaryReport = wrap((q) => service.summary(q), 'Summary');
export const getBudgetsReport = wrap((q) => service.budgetsReport(q), 'Budgets');
export const getExpendituresReport = wrap((q) => service.expendituresReport(q), 'Expenditures');
export const getUtilizationReport = wrap((q) => service.utilizationReport(q), 'Utilization');
export const getAlertsReport = wrap((q) => service.alertsReport(q), 'Alerts');
export const getAuditReport = wrap((q) => service.auditReport(q), 'Audit');
