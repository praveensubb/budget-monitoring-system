import { Router } from 'express';
import { listAuditLogs } from './audit.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.get('/', listAuditLogs);
export default router;
