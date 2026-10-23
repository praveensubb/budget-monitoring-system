import { Router } from 'express';
import { listRules, updateRule, deleteRule } from './rules.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateObjectId } from '../../middleware/validation.middleware';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.get('/', listRules);
router.put('/:id', validateObjectId('id'), updateRule);
router.delete('/:id', validateObjectId('id'), deleteRule);
export default router;
