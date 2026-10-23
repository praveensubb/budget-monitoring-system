import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { roleLabel } from '../../shared/ui.utils';

interface NavItem { label: string; icon: string; route: string; roles: string[]; section?: string; }

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">₹</div>
        <div>
          <h1>Budget Utilization<br>Monitoring System</h1>
          <small>AI-Based Anomaly Detection</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        <ng-container *ngFor="let item of visibleNav()">
          <div class="nav-section" *ngIf="item.section">{{ item.section }}</div>
          <a class="nav-item" [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }">
            <span class="icon">{{ item.icon }}</span> {{ item.label }}
          </a>
        </ng-container>
      </nav>
      <div class="sidebar-footer">FY 2025-26 · v1.0<br>Final Year BE Project</div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="topbar-title">{{ title() }}</div>
        <div class="topbar-user">
          <span class="role-chip">{{ roleLabel(auth.currentUser()?.role || '') }}</span>
          <div class="user-meta">
            <div class="name">{{ auth.currentUser()?.name }}</div>
            <div class="role">{{ deptName() }}</div>
          </div>
          <div class="avatar">{{ initials() }}</div>
          <button class="btn btn-secondary btn-sm" (click)="auth.logout()">Logout</button>
        </div>
      </header>
      <main class="content"><router-outlet></router-outlet></main>
    </div>
  </div>
  `,
})
export class MainLayoutComponent {
  roleLabel = roleLabel;

  nav: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard', roles: ['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'] },
    { label: 'Monitoring', icon: '🛰️', route: '/monitoring', roles: ['ADMIN', 'FINANCE_OFFICER'], section: 'Intelligence' },
    { label: 'Anomaly Detection', icon: '🔍', route: '/monitoring/anomalies', roles: ['ADMIN', 'FINANCE_OFFICER'] },
    { label: 'Alert Center', icon: '🚨', route: '/alerts', roles: ['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'] },
    { label: 'Budgets', icon: '💼', route: '/budgets', roles: ['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'], section: 'Management' },
    { label: 'Expenditures', icon: '🧾', route: '/expenditures', roles: ['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'] },
    { label: 'Departments', icon: '🏛️', route: '/departments', roles: ['ADMIN'] },
    { label: 'Users', icon: '👥', route: '/admin/users', roles: ['ADMIN'] },
    { label: 'Reports', icon: '📈', route: '/reports', roles: ['ADMIN', 'FINANCE_OFFICER'], section: 'Governance' },
    { label: 'Audit Logs', icon: '📜', route: '/audit-logs', roles: ['ADMIN'] },
    { label: 'Monitoring Rules', icon: '⚙️', route: '/settings/rules', roles: ['ADMIN'] },
  ];

  constructor(public auth: AuthService) {}

  visibleNav() {
    const role = this.auth.currentUser()?.role;
    return this.nav.filter(i => i.roles.includes(role || ''));
  }

  initials(): string {
    const name = this.auth.currentUser()?.name || '?';
    return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  deptName(): string {
    const d: any = this.auth.currentUser()?.departmentId;
    return d && typeof d === 'object' ? d.name : 'Central Administration';
  }

  title(): string {
    return 'AI-Based Budget Utilization Monitoring System';
  }
}
