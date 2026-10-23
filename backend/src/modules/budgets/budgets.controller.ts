import { Request, Response, NextFunction } from 'express';
import { BudgetsService } from './budgets.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new BudgetsService();

export async function listBudgets(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Budgets retrieved.', await service.list(req.query, req.user)); }
  catch (e) { next(e); }
}
export async function getBudget(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Budget retrieved.', await service.getById(req.params.id, req.user)); }
  catch (e) { next(e); }
}
export async function createBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const budget = await service.create(req.body, (req.user as any)._id);
    await createAuditLog(req, 'CREATE_BUDGET', 'Budget', budget._id,
      `Budget created: ${budget.category} (${budget.financialYear}) - ₹${budget.allocatedAmount.toLocaleString('en-IN')}.`);
    return sendSuccess(res, 'Budget created successfully.', budget, 201);
  } catch (e) { next(e); }
}
export async function updateBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const budget = await service.update(req.params.id, req.body, req.user);
    await createAuditLog(req, 'UPDATE_BUDGET', 'Budget', budget._id, `Budget ${budget.category} updated.`);
    return sendSuccess(res, 'Budget updated successfully.', budget);
  } catch (e) { next(e); }
}
export async function deleteBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.remove(req.params.id, req.user);
    await createAuditLog(req, 'DELETE_BUDGET', 'Budget', req.params.id, `Budget ${req.params.id} deleted.`);
    return sendSuccess(res, 'Budget deleted successfully.', result);
  } catch (e) { next(e); }
}
