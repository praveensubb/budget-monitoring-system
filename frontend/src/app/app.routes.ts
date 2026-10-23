import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/role-redirect.component').then(m => m.RoleRedirectComponent) },
      { path: 'admin/dashboard', canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./features/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'finance/dashboard', canActivate: [roleGuard(['FINANCE_OFFICER'])], loadComponent: () => import('./features/dashboard/finance-dashboard.component').then(m => m.FinanceDashboardComponent) },
      { path: 'department/dashboard', canActivate: [roleGuard(['DEPARTMENT_HEAD'])], loadComponent: () => import('./features/dashboard/department-dashboard.component').then(m => m.DepartmentDashboardComponent) },
      { path: 'admin/users', canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
      { path: 'departments', canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./features/departments/departments.component').then(m => m.DepartmentsComponent) },
      { path: 'budgets', canActivate: [roleGuard(['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'])], loadComponent: () => import('./features/budgets/budgets.component').then(m => m.BudgetsComponent) },
      { path: 'expenditures', canActivate: [roleGuard(['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'])], loadComponent: () => import('./features/expenditures/expenditures.component').then(m => m.ExpendituresComponent) },
      { path: 'monitoring', canActivate: [roleGuard(['ADMIN', 'FINANCE_OFFICER'])], loadComponent: () => import('./features/monitoring/monitoring.component').then(m => m.MonitoringComponent) },
      { path: 'monitoring/anomalies', canActivate: [roleGuard(['ADMIN', 'FINANCE_OFFICER'])], loadComponent: () => import('./features/monitoring/anomalies.component').then(m => m.AnomaliesComponent) },
      { path: 'alerts', canActivate: [roleGuard(['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'])], loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'reports', canActivate: [roleGuard(['ADMIN', 'FINANCE_OFFICER'])], loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'audit-logs', canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./features/audit/audit-logs.component').then(m => m.AuditLogsComponent) },
      { path: 'settings/rules', canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./features/rules/rules.component').then(m => m.RulesComponent) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
