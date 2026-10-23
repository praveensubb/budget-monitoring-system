import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Authentication required.', 401);
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permission to access this resource.', 403);
    }
    next();
  };
}
