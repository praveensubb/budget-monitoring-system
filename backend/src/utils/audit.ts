import { Request } from 'express';
import AuditLog from '../models/AuditLog';
import { logger } from './logger';

export async function createAuditLog(
  req: Request,
  action: string,
  entity: string,
  entityId: any,
  details: string
): Promise<void> {
  try {
    await AuditLog.create({
      userId: req.user ? req.user._id : null,
      userName: req.user ? req.user.name : 'System',
      action,
      entity,
      entityId,
      details,
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    });
  } catch (error) {
    logger.error('Failed to write audit log', error);
  }
}
