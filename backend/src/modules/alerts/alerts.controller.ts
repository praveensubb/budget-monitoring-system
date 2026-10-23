import { Request, Response, NextFunction } from 'express';
import { AlertsService } from './alerts.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new AlertsService();

export async function listAlerts(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Alerts retrieved.', await service.list(req.query, req.user)); }
  catch (e) { next(e); }
}
export async function getAlert(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Alert retrieved.', await service.getById(req.params.id, req.user)); }
  catch (e) { next(e); }
}
export async function resolveAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const alert = await service.resolve(req.params.id, req.user, req.body?.note);
    await createAuditLog(req, 'RESOLVE_ALERT', 'Alert', alert._id, `Alert resolved: ${alert.message}`);
    return sendSuccess(res, 'Alert resolved successfully.', alert);
  } catch (e) { next(e); }
}
