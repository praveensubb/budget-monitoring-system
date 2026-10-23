import { Request, Response, NextFunction } from 'express';
import AuditLog from '../../models/AuditLog';
import { sendSuccess } from '../../utils/response';

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const filter: any = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.search) filter.$or = [
      { details: new RegExp(req.query.search, 'i') },
      { userName: new RegExp(req.query.search, 'i') },
    ];
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '15', 10)));
    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate('userId', 'name email')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    return sendSuccess(res, 'Audit logs retrieved.', { items, total, page, limit });
  } catch (e) { next(e); }
}
