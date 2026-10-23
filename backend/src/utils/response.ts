import { Response } from 'express';

export function sendSuccess(res: Response, message: string, data: any = null, status = 200): Response {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(res: Response, message: string, status = 400, data: any = null): Response {
  return res.status(status).json({ success: false, message, data });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
