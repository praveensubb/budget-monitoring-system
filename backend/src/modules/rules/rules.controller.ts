import { Request, Response, NextFunction } from 'express';
import { RulesService } from './rules.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new RulesService();

export async function listRules(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Rules retrieved.', await service.list()); }
  catch (e) { next(e); }
}
export async function updateRule(req: Request, res: Response, next: NextFunction) {
  try {
    const before = await service.list();
    const rule = await service.update(req.params.id, req.body);
    await createAuditLog(req, 'UPDATE_RULE', 'ThresholdRule', rule._id,
      `Rule "${rule.name}" updated: threshold=${rule.threshold}, enabled=${rule.enabled}.`);
    return sendSuccess(res, 'Rule updated successfully.', rule);
  } catch (e) { next(e); }
}
export async function deleteRule(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.remove(req.params.id);
    await createAuditLog(req, 'DELETE_RULE', 'ThresholdRule', req.params.id, `Rule ${req.params.id} deleted.`);
    return sendSuccess(res, 'Rule deleted successfully.', result);
  } catch (e) { next(e); }
}
