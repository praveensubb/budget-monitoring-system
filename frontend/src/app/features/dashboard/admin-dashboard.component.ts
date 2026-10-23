import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.service';
import { ChartService } from '../../core/services/chart.service';
import { InrPipe, PercentPipe, DeptNamePipe } from '../../shared/pipes/inr.pipe';
import { levelBadge, levelBar, severityBadge, severityDot, alertTypeLabel } from '../../shared/ui.utils';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, InrPipe, PercentPipe, DeptNamePipe],
  template: `
  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div><p>Loading dashboard…</p></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p><button class="btn btn-secondary" (click)="load()">Retry</button></div>

  <ng-container *ngIf="data && !loading()">
    <div class="page-header">
      <div><h2>Admin Dashboard</h2><div class="sub">Centralized oversight of all departments · FY 2025-26</div></div>
      <a class="btn btn-primary" routerLink="/monitoring">Open Monitoring Center</a>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-icon bg-blue">💼</div><div><div class="kpi-label">Total Budget</div><div class="kpi-value">{{ data.overall.allocated | inr }}</div><div class="kpi-sub">{{ data.departmentsCount }} departments</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-green">🧾</div><div><div class="kpi-label">Total Expenditure</div><div class="kpi-value">{{ data.overall.totalSpent | inr }}</div><div class="kpi-sub">recorded to date</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-cyan">💰</div><div><div class="kpi-label">Remaining Budget</div><div class="kpi-value">{{ data.overall.remaining | inr }}</div><div class="kpi-sub">available balance</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-violet">📊</div><div><div class="kpi-label">Overall Utilization</div><div class="kpi-value">{{ data.overall.utilization | pct }}</div><div class="kpi-sub">{{ data.overall.status }} status</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-amber">🚨</div><div><div class="kpi-label">Active Alerts</div><div class="kpi-value">{{ data.activeAlerts }}</div><div class="kpi-sub">{{ data.highRiskTx }} high risk</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-red">🔻</div><div><div class="kpi-label">Under-utilized Depts</div><div class="kpi-value">{{ data.underUtilizedCount }}</div><div class="kpi-sub">below 25% utilization</div></div></div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header"><h3>Budget vs Expenditure by Department</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="chart-be"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Monthly Expenditure Trend</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="chart-trend"></canvas></div></div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header"><h3>Department-wise Utilization</h3></div>
        <div class="card-body">
          <div *ngFor="let d of data.departments" style="margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;">
              <strong>{{ d.department.name }}</strong><span class="badge {{ levelBadge(d.status) }}">{{ d.utilization | pct }}</span>
            </div>
            <div class="progress"><div class="{{ levelBar(d.status) }}" [style.width.%]="min(d.utilization, 100)"></div></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Alert Distribution (Open)</h3></div>
        <div class="card-body"><div class="chart-box-sm"><canvas id="chart-alerts"></canvas></div></div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><h3>High-Value Transactions</h3><a routerLink="/expenditures" class="btn btn-secondary btn-sm">View all</a></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Description</th><th>Department</th><th class="num">Amount</th><th class="num">% of Budget</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of data.highValueTransactions">
                <td>{{ t.description }}</td>
                <td>{{ t.departmentId | dname }}</td>
                <td class="num"><strong>{{ t.amount | inr }}</strong></td>
                <td class="num"><span class="badge" [ngClass]="t.budgetPct > 25 ? 'badge-red' : 'badge-blue'">{{ t.budgetPct | pct }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Alerts</h3><a routerLink="/alerts" class="btn btn-secondary btn-sm">Alert Center</a></div>
        <div class="card-body" style="padding-top:8px;">
          <div class="activity-item" *ngFor="let a of data.recentAlerts">
            <div class="activity-dot" [style.background]="severityDot(a.severity)"></div>
            <div>
              <span class="badge {{ severityBadge(a.severity) }}" style="margin-right:6px;">{{ a.severity }}</span>
              <strong style="font-size:12.5px;">{{ alertTypeLabel(a.type) }}</strong>
              <div class="muted" style="margin-top:2px;">{{ a.message }}</div>
            </div>
          </div>
          <div class="empty-state" *ngIf="!data.recentAlerts?.length"><div class="big-icon">✅</div><p>No active alerts. All budgets are healthy.</p></div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
})
export class AdminDashboardComponent implements OnInit {
  data: any = null;
  loading = signal(true);
  error = signal('');
  levelBadge = levelBadge; levelBar = levelBar; severityBadge = severityBadge;
  severityDot = severityDot; alertTypeLabel = alertTypeLabel;
  min = Math.min;

  constructor(private dashboard: DashboardService, private charts: ChartService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.dashboard.admin().subscribe({
      next: (res) => { this.data = res.data; this.loading.set(false); setTimeout(() => this.drawCharts(), 0); },
      error: () => { this.error.set('Unable to load dashboard. Please try again.'); this.loading.set(false); },
    });
  }

  drawCharts() {
    const d = this.data;
    const labels = d.departments.map((x: any) => x.department.code);
    this.charts.create('chart-be', {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Allocated', data: d.departments.map((x: any) => x.allocated), backgroundColor: '#1e5eff', borderRadius: 6 },
        { label: 'Spent', data: d.departments.map((x: any) => x.totalSpent), backgroundColor: '#16a34a', borderRadius: 6 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
    this.charts.create('chart-trend', {
      type: 'line',
      data: { labels: d.monthlyTrend.map((m: any) => m.month), datasets: [
        { label: 'Expenditure (₹)', data: d.monthlyTrend.map((m: any) => m.total), borderColor: '#1e5eff', backgroundColor: 'rgba(30,94,255,0.12)', fill: true, tension: 0.35 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
    this.charts.create('chart-alerts', {
      type: 'doughnut',
      data: { labels: d.alertsBySeverity.map((s: any) => s._id), datasets: [
        { data: d.alertsBySeverity.map((s: any) => s.count), backgroundColor: ['#2563eb', '#d97706', '#ea580c', '#dc2626'], borderWidth: 2 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }
}
