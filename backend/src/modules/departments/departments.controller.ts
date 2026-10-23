import { Request, Response, NextFunction } from 'express';
import { DepartmentsService } from './departments.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new DepartmentsService();

export async function listDepartments(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Departments retrieved.', await service.list(req.query)); }
  catch (e) { next(e); }
}
export async function getDepartment(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Department retrieved.', await service.getById(req.params.id)); }
  catch (e) { next(e); }
}
export async function getDepartmentUtilization(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Department utilization retrieved.', await service.utilization(req.params.id, req.query.financialYear)); }
  catch (e) { next(e); }
}
export async function createDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const dept = await service.create(req.body);
    await createAuditLog(req, 'CREATE_DEPARTMENT', 'Department', dept._id, `Department "${dept.name}" created.`);
    return sendSuccess(res, 'Department created successfully.', dept, 201);
  } catch (e) { next(e); }
}
export async function updateDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const dept = await service.update(req.params.id, req.body);
    await createAuditLog(req, 'UPDATE_DEPARTMENT', 'Department', dept._id, `Department "${dept.name}" updated.`);
    return sendSuccess(res, 'Department updated successfully.', dept);
  } catch (e) { next(e); }
}
export async function deleteDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.remove(req.params.id);
    await createAuditLog(req, 'DELETE_DEPARTMENT', 'Department', req.params.id, `Department ${req.params.id} deleted.`);
    return sendSuccess(res, 'Department deleted successfully.', result);
  } catch (e) { next(e); }
}
