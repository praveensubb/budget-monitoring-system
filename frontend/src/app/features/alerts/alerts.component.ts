import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../core/services/data.service';
import { Alert } from '../../core/models/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { severityBadge, alertTypeLabel } from '../../shared/ui.utils';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, InrPipe],
  template: `
  <div class="page-header">
    <div><h2>Alert Center</h2><div class="sub">Review, investigate and resolve monitoring alerts</div></div>
  </div>

  <div class="card">
    <div class="card-body">
      <div class="filters">
        <div class="form-group"><input class="form-control" placeholder="Search alerts…" [(ngModel)]="search" (ngModelChange)="reload()" /></div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="statusFilter" (ngModelChange)="reload()">
            <option value="">All Status</option><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="severityFilter" (ngModelChange)="reload()">
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
      <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

      <div class="table-wrap" *ngIf="!loading() && !error()">
        <table class="table">
          <thead><tr>
            <th>Alert</th><th>Type</th><th>Department</th><th>Severity</th><th>Created</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let a of alerts">
              <td style="max-width:340px;">
                <strong style="font-size:12.5px;">{{ a.message }}</strong>
                <div class="muted" style="font-size:11.5px; margin-top:2px;">{{ a.explanation | slice:0:110 }}…</div>
              </td>
              <td><span class="badge badge-blue">{{ alertTypeLabel(a.type) }}</span></td>
              <td>{{ deptName(a) }}</td>
              <td><span class="badge" [ngClass]="severityBadge(a.severity)">{{ a.severity }}</span></td>
              <td class="muted">{{ a.createdAt | date:'dd MMM yy, hh:mm a' }}</td>
              <td><span class="badge" [ngClass]="a.status === 'OPEN' ? 'badge-yellow' : 'badge-green'">{{ a.status }}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="view(a)">View</button>
                <button class="btn btn-primary btn-sm" style="margin-left:6px;" *ngIf="a.status === 'OPEN'" (click)="askResolve(a)">Resolve</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="!alerts.length"><div class="big-icon">✅</div><p>No alerts match the current filters.</p></div>
        <div class="pager" *ngIf="total > limit">
          <span>Page {{ page }} · {{ total }} alerts</span>
          <div>
            <button class="btn btn-secondary btn-sm" [disabled]="page <= 1" (click)="goPage(page - 1)">← Prev</button>
            <button class="btn btn-secondary btn-sm" style="margin-left:6px;" [disabled]="page * limit >= total" (click)="goPage(page + 1)">Next →</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" *ngIf="detail">
    <div class="modal">
      <div class="modal-head">
        <h3><span class="badge" [ngClass]="severityBadge(detail.severity)" style="margin-right:8px;">{{ detail.severity }}</span>{{ alertTypeLabel(detail.type) }}</h3>
        <button class="close-x" (click)="detail = null">×</button>
      </div>
      <div class="modal-body">
        <div class="detail-row"><span class="lbl">Status</span><span class="val"><span class="badge" [ngClass]="detail.status === 'OPEN' ? 'badge-yellow' : 'badge-green'">{{ detail.status }}</span></span></div>
        <div class="detail-row"><span class="lbl">Department</span><span class="val">{{ deptName(detail) }}</span></div>
        <div class="detail-row" *ngIf="detail.budgetId && !isStr(detail.budgetId)"><span class="lbl">Budget</span><span class="val">{{ detail.budgetId.category }} ({{ detail.budgetId.financialYear }})</span></div>
        <div class="detail-row" *ngIf="detail.expenditureId && !isStr(detail.expenditureId)"><span class="lbl">Transaction</span><span class="val">{{ detail.expenditureId.amount | inr }} · {{ detail.expenditureId.vendor || '—' }}</span></div>
        <div class="detail-row"><span class="lbl">Created</span><span class="val">{{ detail.createdAt | date:'dd MMM yyyy, hh:mm a' }}</span></div>
        <div class="detail-row" *ngIf="detail.resolvedAt"><span class="lbl">Resolved by</span><span class="val">{{ resolverName() }} on {{ detail.resolvedAt | date:'dd MMM yyyy' }}</span></div>
        <p style="font-weight:600; margin:14px 0 6px;">Message</p>
        <p style="margin:0; font-size:13px;">{{ detail.message }}</p>
        <div class="explanation-box"><strong>Explanation:</strong><br>{{ detail.explanation }}</div>
        <div class="explanation-box" style="border-left-color:#16a34a; margin-top:8px;"><strong>Recommended action:</strong> {{ detail.recommendedAction }}</div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" (click)="detail = null">Close</button>
        <button class="btn btn-primary" *ngIf="detail.status === 'OPEN'" (click)="askResolve(detail); detail = null;">Resolve Alert</button>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" *ngIf="resolving">
    <div class="modal" style="max-width:460px;">
      <div class="modal-head"><h3>Resolve Alert</h3><button class="close-x" (click)="resolving = null">×</button></div>
      <div class="modal-body">
        <p class="muted" style="margin-top:0;">{{ resolving.message }}</p>
        <div class="form-group"><label>Resolution note (optional)</label><textarea class="form-control" rows="3" [(ngModel)]="resolveNote" placeholder="Describe the action taken…"></textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" (click)="resolving = null">Cancel</button>
        <button class="btn btn-primary" [disabled]="saving()" (click)="confirmResolve()">{{ saving() ? 'Resolving…' : 'Mark Resolved' }}</button>
      </div>
    </div>
  </div>
  `,
})
export class AlertsComponent implements OnInit {
  alerts: Alert[] = [];
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  search = ''; statusFilter = ''; severityFilter = '';
  page = 1; limit = 10; total = 0;
  detail: Alert | null = null;
  resolving: Alert | null = null;
  resolveNote = '';
  severityBadge = severityBadge; alertTypeLabel = alertTypeLabel;

  constructor(private service: AlertService) {}
  ngOnInit() { this.load(); }

  reload() { this.page = 1; this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.service.list({ search: this.search, status: this.statusFilter, severity: this.severityFilter, page: this.page, limit: this.limit }).subscribe({
      next: (res) => { this.alerts = res.data.items; this.total = res.data.total; this.loading.set(false); },
      error: () => { this.error.set('Unable to load alerts.'); this.loading.set(false); },
    });
  }
  goPage(p: number) { this.page = p; this.load(); }

  deptName(a: Alert): string {
    const d: any = a.departmentId;
    return d && typeof d === 'object' ? d.name : '—';
  }
  isStr(v: any) { return typeof v === 'string'; }
  resolverName(): string {
    const r: any = this.detail?.resolvedBy;
    return r && typeof r === 'object' ? r.name : '—';
  }

  view(a: Alert) {
    this.service.get(a._id).subscribe({
      next: (res) => this.detail = res.data,
      error: () => alert('Unable to load alert details.'),
    });
  }

  askResolve(a: Alert) { this.resolving = a; this.resolveNote = ''; }
  confirmResolve() {
    if (!this.resolving) return;
    this.saving.set(true);
    this.service.resolve(this.resolving._id, this.resolveNote).subscribe({
      next: () => { this.saving.set(false); this.resolving = null; this.load(); },
      error: (err) => { this.saving.set(false); alert(err?.error?.message || 'Could not resolve alert.'); },
    });
  }
}
