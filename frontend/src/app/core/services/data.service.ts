import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import {
  Alert, ApiResponse, AuditLog, Budget, Department, DepartmentUtilization, Expenditure,
  MonitoringSummary, Paged, ThresholdRule, User,
} from '../models/models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private api: ApiService) {}
  list(q?: any): Observable<ApiResponse<Department[]>> { return this.api.get('/departments', q); }
  get(id: string): Observable<ApiResponse<Department>> { return this.api.get(`/departments/${id}`); }
  create(body: any): Observable<ApiResponse<Department>> { return this.api.post('/departments', body); }
  update(id: string, body: any): Observable<ApiResponse<Department>> { return this.api.put(`/departments/${id}`, body); }
  remove(id: string): Observable<ApiResponse<any>> { return this.api.delete(`/departments/${id}`); }
  utilization(id: string, fy?: string): Observable<ApiResponse<any>> { return this.api.get(`/departments/${id}/utilization`, { financialYear: fy }); }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}
  list(q?: any): Observable<ApiResponse<Paged<User>>> { return this.api.get('/users', q); }
  create(body: any): Observable<ApiResponse<User>> { return this.api.post('/users', body); }
  update(id: string, body: any): Observable<ApiResponse<User>> { return this.api.put(`/users/${id}`, body); }
  remove(id: string): Observable<ApiResponse<any>> { return this.api.delete(`/users/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  constructor(private api: ApiService) {}
  list(q?: any): Observable<ApiResponse<Budget[]>> { return this.api.get('/budgets', q); }
  get(id: string): Observable<ApiResponse<any>> { return this.api.get(`/budgets/${id}`); }
  create(body: any): Observable<ApiResponse<Budget>> { return this.api.post('/budgets', body); }
  update(id: string, body: any): Observable<ApiResponse<Budget>> { return this.api.put(`/budgets/${id}`, body); }
  remove(id: string): Observable<ApiResponse<any>> { return this.api.delete(`/budgets/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ExpenditureService {
  constructor(private api: ApiService) {}
  list(q?: any): Observable<ApiResponse<Paged<Expenditure>>> { return this.api.get('/expenditures', q); }
  get(id: string): Observable<ApiResponse<Expenditure>> { return this.api.get(`/expenditures/${id}`); }
  create(body: any): Observable<ApiResponse<Expenditure>> { return this.api.post('/expenditures', body); }
  update(id: string, body: any): Observable<ApiResponse<Expenditure>> { return this.api.put(`/expenditures/${id}`, body); }
  remove(id: string): Observable<ApiResponse<any>> { return this.api.delete(`/expenditures/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  constructor(private api: ApiService) {}
  summary(): Observable<ApiResponse<MonitoringSummary>> { return this.api.get('/monitoring/summary'); }
  departments(fy?: string): Observable<ApiResponse<DepartmentUtilization[]>> { return this.api.get('/monitoring/departments', { financialYear: fy }); }
  anomalies(): Observable<ApiResponse<Alert[]>> { return this.api.get('/monitoring/anomalies'); }
  underUtilized(): Observable<ApiResponse<any[]>> { return this.api.get('/monitoring/under-utilized'); }
  highValue(): Observable<ApiResponse<any[]>> { return this.api.get('/monitoring/high-value-transactions'); }
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private api: ApiService) {}
  list(q?: any): Observable<ApiResponse<Paged<Alert>>> { return this.api.get('/alerts', q); }
  get(id: string): Observable<ApiResponse<Alert>> { return this.api.get(`/alerts/${id}`); }
  resolve(id: string, note?: string): Observable<ApiResponse<Alert>> { return this.api.patch(`/alerts/${id}/resolve`, { note }); }
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private api: ApiService) {}
  summary(q?: any): Observable<ApiResponse<any>> { return this.api.get('/reports/summary', q); }
  budgets(q?: any): Observable<ApiResponse<any[]>> { return this.api.get('/reports/budgets', q); }
  expenditures(q?: any): Observable<ApiResponse<any>> { return this.api.get('/reports/expenditures', q); }
  utilization(q?: any): Observable<ApiResponse<any[]>> { return this.api.get('/reports/utilization', q); }
  alerts(q?: any): Observable<ApiResponse<any>> { return this.api.get('/reports/alerts', q); }
  audit(q?: any): Observable<ApiResponse<AuditLog[]>> { return this.api.get('/reports/audit', q); }
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private api: ApiService) {}
  list(q?: any): Observable<ApiResponse<Paged<AuditLog>>> { return this.api.get('/audit-logs', q); }
}

@Injectable({ providedIn: 'root' })
export class RulesService {
  constructor(private api: ApiService) {}
  list(): Observable<ApiResponse<ThresholdRule[]>> { return this.api.get('/rules'); }
  update(id: string, body: any): Observable<ApiResponse<ThresholdRule>> { return this.api.put(`/rules/${id}`, body); }
  remove(id: string): Observable<ApiResponse<any>> { return this.api.delete(`/rules/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}
  admin(): Observable<ApiResponse<any>> { return this.api.get('/dashboard/admin'); }
  finance(): Observable<ApiResponse<any>> { return this.api.get('/dashboard/finance'); }
  department(): Observable<ApiResponse<any>> { return this.api.get('/dashboard/department'); }
}
