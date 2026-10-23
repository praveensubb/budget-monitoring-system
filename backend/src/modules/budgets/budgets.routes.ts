import { Router } from 'express';
import { listBudgets, getBudget, createBudget, updateBudget, deleteBudget } from './budgets.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateBody, validateObjectId } from '../../middleware/validation.middleware';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), listBudgets);
router.get('/:id', validateObjectId('id'), requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), getBudget);
router.post('/', requireRole('ADMIN'), validateBody({
  departmentId: { type: 'objectId', required: true },
  financialYear: { type: 'string', required: true },
  category: { type: 'string', required: true },
  allocatedAmount: { type: 'number', required: true, min: 1 },
}), createBudget);
router.put('/:id', validateObjectId('id'), requireRole('ADMIN', 'FINANCE_OFFICER'), updateBudget);
router.delete('/:id', validateObjectId('id'), requireRole('ADMIN'), deleteBudget);

export default router;
