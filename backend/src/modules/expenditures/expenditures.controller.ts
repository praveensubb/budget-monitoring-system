import { Request, Response, NextFunction } from 'express';
import { ExpendituresService } from './expenditures.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new ExpendituresService();

export async function listExpenditures(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Expenditures retrieved.', await service.list(req.query, req.user)); }
  catch (e) { next(e); }
}
export async function getExpenditure(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Expenditure retrieved.', await service.getById(req.params.id, req.user)); }
  catch (e) { next(e); }
}
export async function createExpenditure(req: Request, res: Response, next: NextFunction) {
  try {
    const exp = await service.create(req.body, req.user);
    await createAuditLog(req, 'CREATE_EXPENDITURE', 'Expenditure', exp._id,
      `Expenditure of ₹${exp.amount.toLocaleString('en-IN')} recorded (${(exp as any).departmentId?.name ?? 'dept'}).`);
    return sendSuccess(res, 'Expenditure recorded successfully.', exp, 201);
  } catch (e) { next(e); }
}
export async function updateExpenditure(req: Request, res: Response, next: NextFunction) {
  try {
    const exp = await service.update(req.params.id, req.body, req.user);
    await createAuditLog(req, 'UPDATE_EXPENDITURE', 'Expenditure', exp._id, `Expenditure updated to ₹${exp.amount.toLocaleString('en-IN')}.`);
    return sendSuccess(res, 'Expenditure updated successfully.', exp);
  } catch (e) { next(e); }
}
export async function deleteExpenditure(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.remove(req.params.id, req.user);
    await createAuditLog(req, 'DELETE_EXPENDITURE', 'Expenditure', req.params.id, `Expenditure ${req.params.id} deleted.`);
    return sendSuccess(res, 'Expenditure deleted successfully.', result);
  } catch (e) { next(e); }
}
