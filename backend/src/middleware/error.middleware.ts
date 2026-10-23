import { Request, Response, NextFunction } from 'express';
import { sendError, ApiError } from '../utils/response';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.status);
  }
  if (err.name === 'CastError') {
    return sendError(res, 'Invalid identifier provided.', 400);
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((e: any) => e.message).join(', ');
    return sendError(res, message || 'Validation failed.', 400);
  }
  if (err.code === 11000) {
    return sendError(res, 'Duplicate entry: a record with this value already exists.', 409);
  }
  logger.error('Unhandled error', err.message);
  return sendError(res, 'Internal server error. Please try again later.', 500);
}
