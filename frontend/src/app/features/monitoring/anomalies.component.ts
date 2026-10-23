import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MonitoringService } from '../../core/services/data.service';
import { Alert } from '../../core/models/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { severityBadge, severityDot, alertTypeLabel } from '../../shared/ui.utils';

@Component({
  selector: 'app-anomalies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InrPipe],
  template: `
  <div class="page-header">
    <div><h2>Anomaly Detection</h2><div class="sub">Rule-based analytical intelligence — every flag includes an explanation of why it was triggered</div></div>
    <button class="btn btn-primary" (click)="load()">Re-run Analysis</button>
  </div>

  <div class="alert-banner warning">
    <span style="font-size:16px;">🧠</span>
    <div><strong>Phase 1 — Rule-based detection.</strong> Anomalies are detected using configurable analytical rules
    (utilization thresholds, large transactions, suspicious spending clusters and under-utilization). No trained ML model is claimed.</div>
  </div>

  <div class="kpi-grid" *ngIf="!loading()">
    <div class="kpi"><div class="kpi-icon bg-red">🚨</div><div><div class="kpi-label">Total Anomalies</div><div class="kpi-value">{{ anomalies.length }}</div></div></div>
    <div class="kpi"><div class="kpi-icon bg-orange">🔥</div><div><div class="kpi-label">Critical</div><div class="kpi-value">{{ countBy('CRITICAL') }}</div></div></div>
    <div class="kpi"><div class="kpi-icon bg-amber">⚠️</div><div><div class="kpi-label">High</div><div class="kpi-value">{{ countBy('HIGH') }}</div></div></div>
    <div class="kpi"><div class="kpi-icon bg-cyan">👁️</div><div><div class="kpi-label">Medium / Low</div><div class="kpi-value">{{ countBy('MEDIUM') + countBy('LOW') }}</div></div></div>
  </div>

  <div class="filters">
    <div class="form-group">
      <select class="form-control" [(ngModel)]="typeFilter" (ngModelChange)="applyFilter()">
        <option value="">All Rule Types</option>
        <option value="CRITICAL_UTILIZATION">Critical / Over Budget</option>
        <option value="HIGH_RISK_UTILIZATION">High Risk Utilization</option>
        <option value="UTILIZATION_WARNING">Utilization Warning</option>
        <option value="LARGE_TRANSACTION">Large Transaction</option>
        <option value="SUSPICIOUS_SPENDING">Suspicious Spending</option>
        <option value="UNDER_UTILIZATION">Under-utilization</option>
      </select>
    </div>
    <div class="form-group">
      <select class="form-control" [(ngModel)]="severityFilter" (ngModelChange)="applyFilter()">
        <option value="">All Severities</option>
        <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
      </select>
    </div>
  </div>

  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div><p>Running anomaly rules across all budgets…</p></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

  <div class="empty-state" *ngIf="!loading() && !filtered.length && !error()">
    <div class="big-icon">✅</div><p>No anomalies match the selected filters. All budgets are within configured rules.</p>
  </div>

  <div class="card" *ngFor="let a of filtered" style="margin-bottom:14px;">
    <div class="card-body">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div class="activity-dot" style="background:{{ severityDot(a.severity) }}; width:12px; height:12px; margin-top:5px;"></div>
          <div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span class="badge" [ngClass]="severityBadge(a.severity)">{{ a.severity }}</span>
              <span class="badge badge-blue">{{ alertTypeLabel(a.type) }}</span>
              <span class="badge" [ngClass]="a.status === 'OPEN' ? 'badge-yellow' : 'badge-green'">{{ a.status }}</span>
            </div>
            <h3 style="margin:8px 0 4px; font-size:15px;">{{ a.message }}</h3>
            <div class="muted" style="font-size:12px;">
              {{ deptName(a) }}
              <span *ngIf="a.budgetId"> · Budget: {{ budgetLabel(a) }}</span>
              <span *ngIf="expAmount(a)"> · Transaction: {{ expAmount(a) | inr }}</span>
              · {{ a.createdAt | date:'dd MMM yyyy, hh:mm a' }}
            </div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="toggle(a)">{{ expanded.has(a._id) ? 'Hide ▲' : 'Why flagged? ▼' }}</button>
      </div>

      <div *ngIf="expanded.has(a._id)" style="margin-top:12px;">
        <div class="explanation-box">
          <strong>Why this was flagged:</strong><br>{{ a.explanation }}
        </div>
        <div class="explanation-box" style="border-left-color:#16a34a; margin-top:8px;">
          <strong>Recommended action:</strong> {{ a.recommendedAction }}
        </div>
        <div class="detail-row" style="margin-top:10px;" *ngIf="a.expenditureId && !isString(a.expenditureId)">
          <span class="lbl">Vendor / Invoice</span>
          <span class="val">{{ expField(a, 'vendor') || '—' }} · {{ expField(a, 'invoiceNumber') || '—' }}</span>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class AnomaliesComponent implements OnInit {
  anomalies: Alert[] = [];
  filtered: Alert[] = [];
  loading = signal(true);
  error = signal('');
  typeFilter = ''; severityFilter = '';
  expanded = new Set<string>();
  severityBadge = severityBadge; severityDot = severityDot; alertTypeLabel = alertTypeLabel;

  constructor(private monitoring: MonitoringService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.monitoring.anomalies().subscribe({
      next: (res) => { this.anomalies = res.data; this.applyFilter(); this.loading.set(false); },
      error: () => { this.error.set('Unable to run anomaly detection.'); this.loading.set(false); },
    });
  }

  applyFilter() {
    this.filtered = this.anomalies.filter(a =>
      (!this.typeFilter || a.type === this.typeFilter) &&
      (!this.severityFilter || a.severity === this.severityFilter));
  }

  countBy(sev: string) { return this.anomalies.filter(a => a.severity === sev).length; }

  toggle(a: Alert) {
    this.expanded.has(a._id) ? this.expanded.delete(a._id) : this.expanded.add(a._id);
  }

  isString(v: any) { return typeof v === 'string'; }
  deptName(a: Alert): string {
    const d: any = a.departmentId;
    return d && typeof d === 'object' ? d.name : '';
  }
  budgetLabel(a: Alert): string {
    const b: any = a.budgetId;
    return b && typeof b === 'object' ? `${b.category} (${b.financialYear})` : '';
  }
  expAmount(a: Alert): number | null {
    const e: any = a.expenditureId;
    return e && typeof e === 'object' ? e.amount : null;
  }
  expField(a: Alert, field: string): string {
    const e: any = a.expenditureId;
    return e && typeof e === 'object' ? e[field] : '';
  }
}
