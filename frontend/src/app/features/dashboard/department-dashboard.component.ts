import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.service';
import { ChartService } from '../../core/services/chart.service';
import { InrPipe, PercentPipe } from '../../shared/pipes/inr.pipe';
import { levelBadge, levelBar, severityBadge, severityDot, alertTypeLabel } from '../../shared/ui.utils';

@Component({
  selector: 'app-department-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, InrPipe, PercentPipe],
  template: `
  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div><p>Loading department dashboard…</p></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p><button class="btn btn-secondary" (click)="load()">Retry</button></div>

  <ng-container *ngIf="data && !loading()">
    <div class="page-header">
      <div>
        <h2>{{ data.department?.name || 'Department' }} Dashboard</h2>
        <div class="sub">Head: {{ data.department?.head }} · FY 2025-26</div>
      </div>
      <a class="btn btn-primary" routerLink="/expenditures">Submit Expenditure</a>
    </div>

    <div class="alert-banner" *ngIf="data.overall.status !== 'GREEN'" [ngClass]="data.overall.status === 'RED' || data.overall.status === 'ORANGE' ? 'critical' : 'warning'">
      <span style="font-size:18px;">⚠️</span>
      <div><strong>Budget health: {{ data.overall.status }}.</strong> Department utilization is at {{ data.overall.utilization | pct }}.
        Review the alerts below and take corrective action.</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-icon bg-blue">💼</div><div><div class="kpi-label">Department Budget</div><div class="kpi-value">{{ data.overall.allocated | inr }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-green">🧾</div><div><div class="kpi-label">Expenditure</div><div class="kpi-value">{{ data.overall.totalSpent | inr }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-cyan">💰</div><div><div class="kpi-label">Remaining</div><div class="kpi-value">{{ data.overall.remaining | inr }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-violet">📊</div><div><div class="kpi-label">Utilization</div><div class="kpi-value">{{ data.overall.utilization | pct }}</div></div></div>
      <div class="kpi"><div class="kpi-icon bg-amber">🚨</div><div><div class="kpi-label">Active Alerts</div><div class="kpi-value">{{ data.activeAlerts }}</div></div></div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header"><h3>Budget vs Expenditure</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="dchart-be"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Monthly Expenditure</h3></div>
        <div class="card-body"><div class="chart-box"><canvas id="dchart-trend"></canvas></div></div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><h3>Recent Department Expenditures</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let e of data.recentExpenditures">
                <td class="muted">{{ e.date | date:'dd MMM yyyy' }}</td>
                <td>{{ e.description }}</td>
                <td class="num"><strong>{{ e.amount | inr }}</strong></td>
                <td><span class="badge" [ngClass]="e.status === 'RECORDED' ? 'badge-blue' : 'badge-green'">{{ e.status }}</span></td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" *ngIf="!data.recentExpenditures?.length"><div class="big-icon">🧾</div><p>No expenditures recorded yet.</p></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Department Alerts</h3><a routerLink="/alerts" class="btn btn-secondary btn-sm">Alert Center</a></div>
        <div class="card-body" style="padding-top:8px;">
          <div class="activity-item" *ngFor="let a of data.recentAlerts">
            <div class="activity-dot" [style.background]="severityDot(a.severity)"></div>
            <div>
              <span class="badge {{ severityBadge(a.severity) }}" style="margin-right:6px;">{{ a.severity }}</span>
              <strong style="font-size:12.5px;">{{ alertTypeLabel(a.type) }}</strong>
              <div class="muted" style="margin-top:2px;">{{ a.message }}</div>
            </div>
          </div>
          <div class="empty-state" *ngIf="!data.recentAlerts?.length"><div class="big-icon">✅</div><p>No active alerts for your department.</p></div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
})
export class DepartmentDashboardComponent implements OnInit {
  data: any = null;
  loading = signal(true);
  error = signal('');
  levelBadge = levelBadge; levelBar = levelBar; severityBadge = severityBadge;
  severityDot = severityDot; alertTypeLabel = alertTypeLabel;

  constructor(private dashboard: DashboardService, private charts: ChartService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.dashboard.department().subscribe({
      next: (res) => { this.data = res.data; this.loading.set(false); setTimeout(() => this.drawCharts(), 0); },
      error: () => { this.error.set('Unable to load dashboard. Please try again.'); this.loading.set(false); },
    });
  }

  drawCharts() {
    const d = this.data;
    this.charts.create('dchart-be', {
      type: 'bar',
      data: { labels: ['Allocated', 'Spent', 'Remaining'], datasets: [
        { data: [d.overall.allocated, d.overall.totalSpent, d.overall.remaining], backgroundColor: ['#1e5eff', '#ea580c', '#16a34a'], borderRadius: 8 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
    this.charts.create('dchart-trend', {
      type: 'line',
      data: { labels: d.monthlyTrend.map((m: any) => m.month), datasets: [
        { label: 'Expenditure (₹)', data: d.monthlyTrend.map((m: any) => m.total), borderColor: '#1e5eff', backgroundColor: 'rgba(30,94,255,0.12)', fill: true, tension: 0.35 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
  }
}
