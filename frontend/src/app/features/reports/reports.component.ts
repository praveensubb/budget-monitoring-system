import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, DepartmentService } from '../../core/services/data.service';
import { ChartService } from '../../core/services/chart.service';
import { Department } from '../../core/models/models';
import { InrPipe, PercentPipe } from '../../shared/pipes/inr.pipe';
import { levelBadge, severityBadge, alertTypeLabel, exportCsv } from '../../shared/ui.utils';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, InrPipe, PercentPipe],
  template: `
  <div class="page-header">
    <div><h2>Reports & Analytics</h2><div class="sub">Generate financial reports with filters and export options</div></div>
  </div>

  <div class="filters" style="background:#fff; padding:16px; border-radius:12px; border:1px solid var(--border);">
    <div class="form-group"><label>Report</label>
      <select class="form-control" [(ngModel)]="reportType" (ngModelChange)="generate()">
        <option value="summary">Overall Budget Report</option>
        <option value="budgets">Department Budget Report</option>
        <option value="expenditures">Expenditure Report</option>
        <option value="utilization">Utilization Report</option>
        <option value="alerts">Alert Report</option>
      </select>
    </div>
    <div class="form-group"><label>Department</label>
      <select class="form-control" [(ngModel)]="deptFilter" (ngModelChange)="generate()">
        <option value="">All Departments</option>
        <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
      </select>
    </div>
    <div class="form-group"><label>Financial Year</label>
      <select class="form-control" [(ngModel)]="fyFilter" (ngModelChange)="generate()">
        <option value="">All Years</option><option value="2025-26">2025-26</option>
      </select>
    </div>
    <div class="form-group"><label>From Date</label><input type="date" class="form-control" [(ngModel)]="fromDate" (ngModelChange)="generate()" /></div>
    <div class="form-group"><label>To Date</label><input type="date" class="form-control" [(ngModel)]="toDate" (ngModelChange)="generate()" /></div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-primary" (click)="generate()">Generate</button>
      <button class="btn btn-secondary" (click)="exportCurrent()">⬇ CSV</button>
      <button class="btn btn-secondary" (click)="printReport()">🖨 PDF</button>
    </div>
  </div>

  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div><p>Generating report…</p></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

  <ng-container *ngIf="!loading() && !error() && data">
    <!-- SUMMARY -->
    <ng-container *ngIf="reportType === 'summary'">
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-icon bg-blue">💼</div><div><div class="kpi-label">Total Allocation</div><div class="kpi-value">{{ data.allocated | inr }}</div></div></div>
        <div class="kpi"><div class="kpi-icon bg-green">🧾</div><div><div class="kpi-label">Total Expenditure</div><div class="kpi-value">{{ data.totalSpent | inr }}</div></div></div>
        <div class="kpi"><div class="kpi-icon bg-cyan">💰</div><div><div class="kpi-label">Remaining</div><div class="kpi-value">{{ data.remaining | inr }}</div></div></div>
        <div class="kpi"><div class="kpi-icon bg-violet">📊</div><div><div class="kpi-label">Utilization</div><div class="kpi-value">{{ data.utilization | pct }}</div></div></div>
      </div>
      <div class="card"><div class="card-header"><h3>Overall Budget Summary — FY {{ fyFilter || 'All' }}</h3></div>
        <div class="card-body">
          <div class="detail-row"><span class="lbl">Active Departments</span><span class="val">{{ data.departments }}</span></div>
          <div class="detail-row"><span class="lbl">Total Alerts Generated</span><span class="val">{{ data.alerts }}</span></div>
          <div class="detail-row"><span class="lbl">Expenditure Records</span><span class="val">{{ data.expenditures }}</span></div>
          <div class="detail-row"><span class="lbl">Budget Health</span><span class="val"><span class="badge" [ngClass]="levelBadge(data.status)">{{ data.status }}</span></span></div>
        </div>
      </div>
    </ng-container>

    <!-- BUDGETS -->
    <ng-container *ngIf="reportType === 'budgets'">
      <div class="card">
        <div class="card-header"><h3>Department Budget Report</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Department</th><th>Category</th><th>FY</th><th class="num">Allocated</th><th class="num">Utilized</th><th class="num">Remaining</th><th class="num">%</th><th>Health</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of asArray(data)">
                <td>{{ r.budget?.departmentId?.name || deptName(r.budget) }}</td>
                <td>{{ r.budget?.category }}</td>
                <td class="mono">{{ r.budget?.financialYear }}</td>
                <td class="num">{{ r.allocated | inr }}</td>
                <td class="num">{{ r.totalSpent | inr }}</td>
                <td class="num">{{ r.remaining | inr }}</td>
                <td class="num">{{ r.utilization | pct }}</td>
                <td><span class="badge" [ngClass]="levelBadge(r.status)">{{ r.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ng-container>

    <!-- EXPENDITURES -->
    <ng-container *ngIf="reportType === 'expenditures'">
      <div class="grid grid-2" style="margin-bottom:20px;">
        <div class="card"><div class="card-header"><h3>Category-wise Expenditure</h3></div>
          <div class="card-body"><div class="chart-box"><canvas id="rchart-cat"></canvas></div></div>
        </div>
        <div class="card"><div class="card-header"><h3>Monthly Trend</h3></div>
          <div class="card-body"><div class="chart-box"><canvas id="rchart-month"></canvas></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Expenditure Records ({{ data.items?.length || 0 }})</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Date</th><th>Description</th><th>Department</th><th>Budget</th><th>Vendor</th><th class="num">Amount</th></tr></thead>
            <tbody>
              <tr *ngFor="let e of data.items || []">
                <td class="muted">{{ e.date | date:'dd MMM yy' }}</td>
                <td>{{ e.description }}</td>
                <td>{{ e.departmentId?.name }}</td>
                <td>{{ e.budgetId?.category }}</td>
                <td class="muted">{{ e.vendor || '—' }}</td>
                <td class="num"><strong>{{ e.amount | inr }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ng-container>

    <!-- UTILIZATION -->
    <ng-container *ngIf="reportType === 'utilization'">
      <div class="card">
        <div class="card-header"><h3>Budget Utilization Report</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Department</th><th>Category</th><th class="num">Allocated</th><th class="num">Utilized</th><th class="num">Remaining</th><th style="min-width:150px;">Utilization</th><th>Health</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of asArray(data)">
                <td>{{ deptName(r.budget) }}</td>
                <td>{{ r.budget?.category }}</td>
                <td class="num">{{ r.allocated | inr }}</td>
                <td class="num">{{ r.totalSpent | inr }}</td>
                <td class="num">{{ r.remaining | inr }}</td>
                <td><div class="util-cell"><div class="progress"><div class="bar-blue" [style.width.%]="min(r.utilization,100)" style="background:#1e5eff;"></div></div><span>{{ r.utilization | pct }}</span></div></td>
                <td><span class="badge" [ngClass]="levelBadge(r.status)">{{ r.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ng-container>

    <!-- ALERTS -->
    <ng-container *ngIf="reportType === 'alerts'">
      <div class="grid grid-2" style="margin-bottom:20px;">
        <div class="card"><div class="card-header"><h3>Alerts by Severity</h3></div>
          <div class="card-body"><div class="chart-box-sm"><canvas id="rchart-sev"></canvas></div></div>
        </div>
        <div class="card"><div class="card-header"><h3>Summary</h3></div>
          <div class="card-body">
            <div class="detail-row"><span class="lbl">Total Alerts</span><span class="val">{{ data.items?.length || 0 }}</span></div>
            <div class="detail-row" *ngFor="let s of data.bySeverity || []"><span class="lbl">{{ s._id }}</span><span class="val">{{ s.count }}</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Alert Records</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Date</th><th>Severity</th><th>Type</th><th>Department</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of data.items || []">
                <td class="muted">{{ a.createdAt | date:'dd MMM yy' }}</td>
                <td><span class="badge" [ngClass]="severityBadge(a.severity)">{{ a.severity }}</span></td>
                <td>{{ alertTypeLabel(a.type) }}</td>
                <td>{{ a.departmentId?.name || '—' }}</td>
                <td style="max-width:320px;">{{ a.message }}</td>
                <td><span class="badge" [ngClass]="a.status === 'OPEN' ? 'badge-yellow' : 'badge-green'">{{ a.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ng-container>
  </ng-container>
  `,
})
export class ReportsComponent implements OnInit {
  data: any = null;
  departments: Department[] = [];
  loading = signal(false);
  error = signal('');
  reportType = 'summary';
  deptFilter = ''; fyFilter = ''; fromDate = ''; toDate = '';
  levelBadge = levelBadge; severityBadge = severityBadge; alertTypeLabel = alertTypeLabel;
  min = Math.min;

  constructor(private reports: ReportService, private deptService: DepartmentService, private charts: ChartService) {}
  ngOnInit() {
    this.deptService.list().subscribe(res => this.departments = res.data || []);
    this.generate();
  }

  asArray(d: any): any[] { return Array.isArray(d) ? d : []; }
  deptName(b: any): string {
    const d: any = b?.departmentId;
    return d && typeof d === 'object' ? d.name : '—';
  }

  query() {
    return { departmentId: this.deptFilter, financialYear: this.fyFilter, from: this.fromDate, to: this.toDate };
  }

  generate() {
    this.loading.set(true); this.error.set('');
    const q = this.query();
    const call = this.reportType === 'summary' ? this.reports.summary(q)
      : this.reportType === 'budgets' ? this.reports.budgets(q)
      : this.reportType === 'expenditures' ? this.reports.expenditures(q)
      : this.reportType === 'utilization' ? this.reports.utilization(q)
      : this.reports.alerts(q);
    call.subscribe({
      next: (res) => {
        this.data = res.data; this.loading.set(false);
        if (this.reportType === 'expenditures' || this.reportType === 'alerts') setTimeout(() => this.drawCharts(), 0);
      },
      error: () => { this.error.set('Unable to generate report.'); this.loading.set(false); },
    });
  }

  drawCharts() {
    if (this.reportType === 'expenditures' && this.data?.byCategory) {
      this.charts.create('rchart-cat', {
        type: 'bar',
        data: { labels: this.data.byCategory.map((c: any) => c.category), datasets: [{ data: this.data.byCategory.map((c: any) => c.total), backgroundColor: '#1e5eff', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
      this.charts.create('rchart-month', {
        type: 'line',
        data: { labels: this.data.monthly.map((m: any) => m.month), datasets: [{ data: this.data.monthly.map((m: any) => m.total), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.12)', fill: true, tension: 0.35 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
    }
    if (this.reportType === 'alerts' && this.data?.bySeverity) {
      this.charts.create('rchart-sev', {
        type: 'doughnut',
        data: { labels: this.data.bySeverity.map((s: any) => s._id), datasets: [{ data: this.data.bySeverity.map((s: any) => s.count), backgroundColor: ['#2563eb', '#d97706', '#ea580c', '#dc2626'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      });
    }
  }

  exportCurrent() {
    const d = this.data;
    if (!d) return;
    if (this.reportType === 'budgets' || this.reportType === 'utilization') {
      const rows = this.asArray(d).map((r: any) => [this.deptName(r.budget), r.budget?.category, r.budget?.financialYear, r.allocated, r.totalSpent, r.remaining, r.utilization.toFixed(1), r.status]);
      exportCsv(`${this.reportType}-report.csv`, ['Department', 'Category', 'FY', 'Allocated', 'Utilized', 'Remaining', 'Utilization %', 'Health'], rows);
    } else if (this.reportType === 'expenditures') {
      const rows = (d.items || []).map((e: any) => [e.date?.slice(0, 10), e.description, e.departmentId?.name, e.budgetId?.category, e.vendor, e.amount]);
      exportCsv('expenditure-report.csv', ['Date', 'Description', 'Department', 'Budget', 'Vendor', 'Amount'], rows);
    } else if (this.reportType === 'alerts') {
      const rows = (d.items || []).map((a: any) => [a.createdAt?.slice(0, 10), a.severity, a.type, a.departmentId?.name, a.message, a.status]);
      exportCsv('alert-report.csv', ['Date', 'Severity', 'Type', 'Department', 'Message', 'Status'], rows);
    } else {
      exportCsv('summary-report.csv', ['Metric', 'Value'], [
        ['Allocated', d.allocated], ['Expenditure', d.totalSpent], ['Remaining', d.remaining],
        ['Utilization %', d.utilization.toFixed(1)], ['Departments', d.departments], ['Alerts', d.alerts],
      ]);
    }
  }

  printReport() { window.print(); }
}
