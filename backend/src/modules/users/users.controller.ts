import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new UsersService();

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'Users retrieved.', await service.list(req.query)); }
  catch (e) { next(e); }
}
export async function getUser(req: Request, res: Response, next: NextFunction) {
  try { return sendSuccess(res, 'User retrieved.', await service.getById(req.params.id)); }
  catch (e) { next(e); }
}
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.create(req.body);
    await createAuditLog(req, 'CREATE_USER', 'User', user._id, `User "${user.name}" (${user.role}) created.`);
    return sendSuccess(res, 'User created successfully.', user, 201);
  } catch (e) { next(e); }
}
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.update(req.params.id, req.body, (req.user as any)._id);
    await createAuditLog(req, 'UPDATE_USER', 'User', user._id, `User "${user.name}" updated.`);
    return sendSuccess(res, 'User updated successfully.', user);
  } catch (e) { next(e); }
}
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.remove(req.params.id, (req.user as any)._id);
    await createAuditLog(req, 'DELETE_USER', 'User', req.params.id, `User ${req.params.id} deleted.`);
    return sendSuccess(res, 'User deleted successfully.', result);
  } catch (e) { next(e); }
}
