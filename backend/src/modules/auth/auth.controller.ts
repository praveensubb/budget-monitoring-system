import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { createAuditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

const service = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);
    req.user = result.user as any; // attach for audit logging
    await createAuditLog(req, 'LOGIN', 'User', result.user._id, `${result.user.name} logged in successfully.`);
    return sendSuccess(res, 'Login successful.', result);
  } catch (error) { next(error); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.me((req.user as any)._id);
    return sendSuccess(res, 'User profile retrieved.', user);
  } catch (error) { next(error); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await createAuditLog(req, 'LOGOUT', 'User', (req.user as any)._id, `${(req.user as any).name} logged out.`);
    return sendSuccess(res, 'Logout successful.');
  } catch (error) { next(error); }
}
