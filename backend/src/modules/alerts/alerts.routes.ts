import { Router } from 'express';
import { listAlerts, getAlert, resolveAlert } from './alerts.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateObjectId } from '../../middleware/validation.middleware';

const router = Router();
router.use(authenticate, requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'));

router.get('/', listAlerts);
router.get('/:id', validateObjectId('id'), getAlert);
router.patch('/:id/resolve', validateObjectId('id'), resolveAlert);

export default router;
