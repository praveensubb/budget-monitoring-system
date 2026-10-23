import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { env } from '../config/environment';
import { sendError } from '../utils/response';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required. Please login.', 401);
  }
  const token = header.split(' ')[1];
  try {
    const payload: any = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id);
    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'Session expired. Please login again.', 401);
    }
    req.user = user as any;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token. Please login again.', 401);
  }
}
