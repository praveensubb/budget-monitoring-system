import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { sendError } from '../utils/response';

interface FieldRule {
  type: 'string' | 'number' | 'date' | 'objectId';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
}

/** Simple, dependency-free request body validator. */
export function validateBody(rules: Record<string, FieldRule>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const missing = value === undefined || value === null || value === '';
      if (missing) {
        if (rule.required) errors.push(`${field} is required.`);
        continue;
      }
      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) { errors.push(`${field} must be a number.`); continue; }
        if (rule.min !== undefined && num < rule.min) errors.push(`${field} must be at least ${rule.min}.`);
        if (rule.max !== undefined && num > rule.max) errors.push(`${field} must be at most ${rule.max}.`);
      } else if (rule.type === 'date') {
        if (isNaN(Date.parse(value))) errors.push(`${field} must be a valid date.`);
      } else if (rule.type === 'objectId') {
        if (!mongoose.isValidObjectId(value)) errors.push(`${field} is not a valid identifier.`);
      } else {
        if (rule.enum && !rule.enum.includes(String(value))) {
          errors.push(`${field} must be one of: ${rule.enum.join(', ')}.`);
        }
      }
    }
    if (errors.length) return sendError(res, errors.join(' '), 400);
    next();
  };
}

export function validateObjectId(param: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params[param])) {
      return sendError(res, `Invalid ${param} provided.`, 400);
    }
    next();
  };
}
