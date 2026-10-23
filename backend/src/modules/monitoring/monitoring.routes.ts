import { Router } from 'express';
import {
  getSummary, getDepartmentUtilization, getAnomalies, getUnderUtilized, getHighValueTransactions,
} from './monitoring.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
router.use(authenticate);

router.get('/summary', requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), getSummary);
router.get('/departments', requireRole('ADMIN', 'FINANCE_OFFICER'), getDepartmentUtilization);
router.get('/anomalies', requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), getAnomalies);
router.get('/under-utilized', requireRole('ADMIN', 'FINANCE_OFFICER'), getUnderUtilized);
router.get('/high-value-transactions', requireRole('ADMIN', 'FINANCE_OFFICER'), getHighValueTransactions);

export default router;
