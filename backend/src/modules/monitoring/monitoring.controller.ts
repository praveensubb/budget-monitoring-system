import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service';
import { sendSuccess } from '../../utils/response';

const service = new MonitoringService();

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Monitoring summary retrieved.', await service.summary(req.user)); }
  catch (e) { next(e); }
}
export async function getDepartmentUtilization(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Department utilization retrieved.', await service.departmentUtilization(req.query.financialYear, req.user)); }
  catch (e) { next(e); }
}
export async function getAnomalies(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Anomalies retrieved.', await service.anomalies(req.user)); }
  catch (e) { next(e); }
}
export async function getUnderUtilized(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Under-utilized budgets retrieved.', await service.underUtilized(req.user)); }
  catch (e) { next(e); }
}
export async function getHighValueTransactions(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'High value transactions retrieved.', await service.highValueTransactions(10, req.user)); }
  catch (e) { next(e); }
}
