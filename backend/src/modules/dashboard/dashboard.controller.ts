import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';

const service = new DashboardService();

export async function adminDashboard(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Admin dashboard retrieved.', await service.admin()); }
  catch (e) { next(e); }
}
export async function financeDashboard(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Finance dashboard retrieved.', await service.finance()); }
  catch (e) { next(e); }
}
export async function departmentDashboard(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Department dashboard retrieved.', await service.departmentHead(req.user)); }
  catch (e) { next(e); }
}
