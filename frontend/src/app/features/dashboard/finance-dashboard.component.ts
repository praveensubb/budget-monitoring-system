import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.service';
import { ChartService } from '../../core/services/chart.service';
import { InrPipe, PercentPipe, DeptNamePipe } from '../../shared/pipes/inr.pipe';
import { levelBadge, severityBadge } from '../../shared/ui.utils';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, InrPipe, PercentPipe, DeptNamePipe],
  template: `
  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div><p>Loading dashboard…</p></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p><button class="btn btn-secondary" (click)="load()">Retry</button></div>

  <ng-container *ngIf="data && !loading()">
    <div class="page-header">
      <div><h2>Finance Dashboard</h2><div class="sub">Monitor budget utilization across all departments</div></div>
      <a class="btn btn-primary" routerLink="/expenditures">Record Expenditure</a>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-icon bg-blue">💼</div><div><div class="kpi-label">Total Allocation</div><div class="kpi-value">{{ data.overall.allocated | inr }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-green">🧾</div><div><div class="kpi-label">Total Spending</div><div class="kpi-value">{{ data.overall.totalSpent | inr }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-cyan">💰</div><div><div class="kpi-label">Remaining</div><div class="kpi-value">{{ data.overall.remaining | inr }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-violet">📊</div><div><div class="kpi-label">Utilization</div><div class="kpi-value">{{ data.overall.utilization | pct }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-amber">🚨</div><div><div class="kpi-label">Active Alerts</div><div class="kpi-value">{{ data.activeAlerts }}</div></div></div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header"><h3>Department Comparison</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="fchart-dept"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Monthly Expenditure Trend</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="fchart-trend"></canvas></div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Recent Expenditures</h3><a routerLink="/expenditures" class="btn btn-secondary btn-sm">View all</a></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Date</th><th>Description</th><th>Department</th><th>Category</th><th class="num">Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let e of data.recentExpenditures">
              <td class="muted">{{ e.date | date:'dd MMM yyyy' }}</td>
              <td>{{ e.description }}</td>
              <td>{{ e.departmentId | dname }}</td>
              <td>{{ e.category }}</td>
              <td class="num"><strong>{{ e.amount | inr }}</strong></td>
              <td><span class="badge" [ngClass]="statusBadge(e.status)">{{ e.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </ng-container>
  `,
})
export class FinanceDashboardComponent implements OnInit {
  data: any = null;
  loading = signal(true);
  error = signal('');
  levelBadge = levelBadge; severityBadge = severityBadge; statusBadge = (s?: string) => s === 'RECORDED' ? 'badge-blue' : s === 'VERIFIED' ? 'badge-cyan' : 'badge-gray';

  constructor(private dashboard: DashboardService, private charts: ChartService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.dashboard.finance().subscribe({
      next: (res) => { this.data = res.data; this.loading.set(false); setTimeout(() => this.drawCharts(), 0); },
      error: () => { this.error.set('Unable to load dashboard. Please try again.'); this.loading.set(false); },
    });
  }

  drawCharts() {
    const d = this.data;
    this.charts.create('fchart-dept', {
      type: 'bar',
      data: { labels: d.departments.map((x: any) => x.department.code), datasets: [
        { label: 'Allocated', data: d.departments.map((x: any) => x.allocated), backgroundColor: '#93c5fd', borderRadius: 6 },
        { label: 'Spent', data: d.departments.map((x: any) => x.totalSpent), backgroundColor: '#1e5eff', borderRadius: 6 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
    this.charts.create('fchart-trend', {
      type: 'line',
      data: { labels: d.monthlyTrend.map((m: any) => m.month), datasets: [
        { label: 'Expenditure (₹)', data: d.monthlyTrend.map((m: any) => m.total), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.12)', fill: true, tension: 0.35 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
  }
}
