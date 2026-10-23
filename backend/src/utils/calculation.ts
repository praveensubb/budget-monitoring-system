export interface BudgetStats {
  allocated: number;
  totalSpent: number;
  remaining: number;
  utilization: number; // percentage
  status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export function computeBudgetStats(allocated: number, totalSpent: number): BudgetStats {
  const remaining = allocated - totalSpent;
  const utilization = allocated > 0 ? (totalSpent / allocated) * 100 : 0;
  return { allocated, totalSpent, remaining, utilization, status: healthStatus(utilization) };
}

export function healthStatus(utilization: number): 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' {
  if (utilization >= 100) return 'RED';
  if (utilization >= 90) return 'ORANGE';
  if (utilization >= 75) return 'YELLOW';
  return 'GREEN';
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
