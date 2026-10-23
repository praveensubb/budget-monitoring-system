export type Role = 'ADMIN' | 'FINANCE_OFFICER' | 'DEPARTMENT_HEAD';

export interface Department {
  _id: string;
  name: string;
  code: string;
  head: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: Department | string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Budget {
  _id: string;
  departmentId: Department | string;
  financialYear: string;
  category: string;
  allocatedAmount: number;
  description: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  approvedBy?: string;
  // computed by backend
  totalSpent?: number;
  remaining?: number;
  utilization?: number;
  statusLevel?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export interface Expenditure {
  _id: string;
  budgetId: Budget | string;
  departmentId: Department | string;
  amount: number;
  date: string;
  description: string;
  vendor: string;
  invoiceNumber: string;
  category: string;
  status: 'RECORDED' | 'VERIFIED' | 'CANCELLED';
  createdBy?: User | string;
}

export interface Alert {
  _id: string;
  type: string;
  departmentId?: Department | string;
  budgetId?: Budget | string;
  expenditureId?: Expenditure | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  explanation: string;
  recommendedAction: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: User | string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userId?: User | string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ThresholdRule {
  _id: string;
  key: string;
  name: string;
  type: string;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  enabled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DepartmentUtilization {
  department: Department;
  budgetCount?: number;
  allocated: number;
  totalSpent: number;
  remaining: number;
  utilization: number;
  status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export interface MonitoringSummary {
  overall: { allocated: number; totalSpent: number; remaining: number; utilization: number; status: string };
  departments: DepartmentUtilization[];
  activeAlerts: number;
  highRiskTx: number;
  recentAlerts: Alert[];
  monthlyTrend: { month: string; total: number }[];
  alertDistribution: { _id: string; count: number }[];
}
