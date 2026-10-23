import { Router } from 'express';
import { adminDashboard, financeDashboard, departmentDashboard } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/admin', requireRole('ADMIN'), adminDashboard);
router.get('/finance', requireRole('FINANCE_OFFICER', 'ADMIN'), financeDashboard);
router.get('/department', requireRole('DEPARTMENT_HEAD'), departmentDashboard);
export default router;
