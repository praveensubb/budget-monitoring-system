import { Router } from 'express';
import {
  listExpenditures, getExpenditure, createExpenditure, updateExpenditure, deleteExpenditure,
} from './expenditures.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateBody, validateObjectId } from '../../middleware/validation.middleware';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), listExpenditures);
router.get('/:id', validateObjectId('id'), requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), getExpenditure);
router.post('/', requireRole('FINANCE_OFFICER', 'DEPARTMENT_HEAD', 'ADMIN'), validateBody({
  budgetId: { type: 'objectId', required: true },
  departmentId: { type: 'objectId', required: true },
  amount: { type: 'number', required: true, min: 1 },
  date: { type: 'date', required: true },
  description: { type: 'string', required: true },
  category: { type: 'string', required: true },
}), createExpenditure);
router.put('/:id', validateObjectId('id'), requireRole('FINANCE_OFFICER', 'DEPARTMENT_HEAD', 'ADMIN'), updateExpenditure);
router.delete('/:id', validateObjectId('id'), requireRole('ADMIN', 'FINANCE_OFFICER'), deleteExpenditure);

export default router;
