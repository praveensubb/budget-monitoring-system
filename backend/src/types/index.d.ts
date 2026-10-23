import 'express';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        _id: string;
        name: string;
        email: string;
        role: 'ADMIN' | 'FINANCE_OFFICER' | 'DEPARTMENT_HEAD';
        departmentId?: any;
      };
    }
  }
}
export {};
