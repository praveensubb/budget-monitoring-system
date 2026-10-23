import { Router } from 'express';
import {
  getSummaryReport, getBudgetsReport, getExpendituresReport,
  getUtilizationReport, getAlertsReport, getAuditReport,
} from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
router.use(authenticate, requireRole('ADMIN', 'FINANCE_OFFICER'));

router.get('/summary', getSummaryReport);
router.get('/budgets', getBudgetsReport);
router.get('/expenditures', getExpendituresReport);
router.get('/utilization', getUtilizationReport);
router.get('/alerts', getAlertsReport);
router.get('/audit', getAuditReport);

export default router;
