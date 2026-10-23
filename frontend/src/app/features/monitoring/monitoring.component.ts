import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MonitoringService, DepartmentService } from '../../core/services/data.service';
import { DepartmentUtilization, Department } from '../../core/models/models';
import { InrPipe, PercentPipe } from '../../shared/pipes/inr.pipe';
import { levelBadge, levelBar, severityBadge, severityDot, alertTypeLabel } from '../../shared/ui.utils';

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InrPipe, PercentPipe],
  template: `
  <div class="page-header">
    <div><h2>Budget Monitoring Center</h2><div class="sub">Real-time utilization, budget health and risk surveillance</div></div>
    <a class="btn btn-primary" routerLink="/monitoring/anomalies">Anomaly Detection →</a>
  </div>

  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div><p>Analyzing budget data…</p></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p><button class="btn btn-secondary" (click)="load()">Retry</button></div>

  <ng-container *ngIf="!loading() && !error()">
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-icon bg-violet">📊</div><div><div class="kpi-label">Overall Utilization</div><div class="kpi-value">{{ overall.utilization | pct }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-green">💚</div><div><div class="kpi-label">Healthy (Green)</div><div class="kpi-value">{{ countBy('GREEN') }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-amber">⚠️</div><div><div class="kpi-label">Warning (Yellow)</div><div class="kpi-value">{{ countBy('YELLOW') }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-red">🔥</div><div><div class="kpi-label">High Risk / Critical</div><div class="kpi-value">{{ countBy('ORANGE') + countBy('RED') }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-blue">🔻</div><div><div class="kpi-label">Under-utilized</div><div class="kpi-value">{{ under.length }}</div></div></div>
    </div>

    <div class="filters">
      <div class="form-group">
        <select class="form-control" [(ngModel)]="levelFilter" (ngModelChange)="applyFilter()">
          <option value="">All Risk Levels</option>
          <option value="GREEN">Green — Normal</option>
          <option value="YELLOW">Yellow — Warning</option>
          <option value="ORANGE">Orange — High Risk</option>
          <option value="RED">Red — Critical</option>
        </select>
      </div>
      <div class="form-group">
        <select class="form-control" [(ngModel)]="fyFilter" (ngModelChange)="load()">
          <option value="">All Financial Years</option>
          <option value="2025-26">2025-26</option>
        </select>
      </div>
      <button class="btn btn-secondary" (click)="load()">Refresh Analysis</button>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header"><h3>Department Utilization Matrix</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Department</th><th class="num">Allocated</th><th class="num">Spent</th><th class="num">Remaining</th><th style="min-width:150px;">Utilization</th><th>Health</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of filtered">
                <td><strong>{{ d.department.name }}</strong><div class="muted" style="font-size:11px;">{{ d.department.code }} · {{ d.budgetCount || 0 }} budgets</div></td>
                <td class="num">{{ d.allocated | inr }}</td>
                <td class="num">{{ d.totalSpent | inr }}</td>
                <td class="num" [style.color]="d.remaining < 0 ? '#dc2626' : 'inherit'">{{ d.remaining | inr }}</td>
                <td><div class="util-cell"><div class="progress"><div class="{{ levelBar(d.status) }}" [style.width.%]="min(d.utilization, 100)"></div></div><span>{{ d.utilization | pct }}</span></div></td>
                <td><span class="badge" [ngClass]="levelBadge(d.status)">{{ d.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>High-Value Transactions</h3></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Description</th><th class="num">Amount</th><th class="num">% of Budget</th></tr></thead>
              <tbody>
                <tr *ngFor="let t of highValue">
                  <td>{{ t.description }}<div class="muted" style="font-size:11px;">{{ t.departmentId?.name }}</div></td>
                  <td class="num"><strong>{{ t.amount | inr }}</strong></td>
                  <td class="num"><span class="badge" [ngClass]="t.budgetPct > 25 ? 'badge-red' : 'badge-blue'">{{ t.budgetPct | pct }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Under-utilization Watch</h3></div>
          <div class="card-body" style="padding-top:8px;">
            <div class="activity-item" *ngFor="let u of under">
              <div class="activity-dot" style="background:#2563eb;"></div>
              <div>
                <strong style="font-size:12.5px;">{{ u.department.name }} — {{ u.utilization | pct }} utilized</strong>
                <div class="muted">{{ u.explanation }}</div>
                <div style="font-size:12px; margin-top:3px;">💡 {{ u.recommendedAction }}</div>
              </div>
            </div>
            <div class="empty-state" *ngIf="!under.length"><div class="big-icon">✅</div><p>No under-utilized budgets detected.</p></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Recent Monitoring Alerts</h3><a routerLink="/alerts" class="btn btn-secondary btn-sm">Alert Center</a></div>
      <div class="card-body" style="padding-top:8px;">
        <div class="activity-item" *ngFor="let a of recentAlerts">
          <div class="activity-dot" [style.background]="severityDot(a.severity)"></div>
          <div>
            <span class="badge {{ severityBadge(a.severity) }}" style="margin-right:6px;">{{ a.severity }}</span>
            <strong style="font-size:12.5px;">{{ alertTypeLabel(a.type) }}</strong>
            <span class="muted" style="font-size:11.5px; margin-left:8px;">{{ a.createdAt | date:'dd MMM yyyy, hh:mm a' }}</span>
            <div class="muted" style="margin-top:2px;">{{ a.message }}</div>
          </div>
        </div>
        <div class="empty-state" *ngIf="!recentAlerts.length"><div class="big-icon">✅</div><p>No alerts. All monitoring rules are within thresholds.</p></div>
      </div>
    </div>
  </ng-container>
  `,
})
export class MonitoringComponent implements OnInit {
  departments: DepartmentUtilization[] = [];
  filtered: DepartmentUtilization[] = [];
  under: any[] = [];
  highValue: any[] = [];
  recentAlerts: any[] = [];
  overall: any = {};
  loading = signal(true);
  error = signal('');
  levelFilter = ''; fyFilter = '';
  levelBadge = levelBadge; levelBar = levelBar; severityBadge = severityBadge;
  severityDot = severityDot; alertTypeLabel = alertTypeLabel;
  min = Math.min;

  constructor(private monitoring: MonitoringService, private deptService: DepartmentService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.monitoring.departments(this.fyFilter || undefined).subscribe({
      next: (res) => {
        this.departments = res.data;
        this.applyFilter();
        this.monitoring.summary().subscribe(r => {
          this.overall = r.data.overall;
          this.recentAlerts = r.data.recentAlerts || [];
        });
        this.monitoring.underUtilized().subscribe(r => this.under = r.data || []);
        this.monitoring.highValue().subscribe(r => this.highValue = r.data || []);
        this.loading.set(false);
      },
      error: () => { this.error.set('Unable to load monitoring data.'); this.loading.set(false); },
    });
  }

  applyFilter() {
    this.filtered = this.levelFilter
      ? this.departments.filter(d => d.status === this.levelFilter)
      : this.departments;
  }

  countBy(level: string): number {
    return this.departments.filter(d => d.status === level).length;
  }
}
