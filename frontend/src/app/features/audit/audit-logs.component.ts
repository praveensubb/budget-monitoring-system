import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../core/services/data.service';
import { AuditLog } from '../../core/models/models';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page-header">
    <div><h2>Audit Logs</h2><div class="sub">Immutable chronological trail of all system activities · Read-only</div></div>
  </div>

  <div class="card">
    <div class="card-body">
      <div class="filters">
        <div class="form-group"><input class="form-control" placeholder="Search details or user…" [(ngModel)]="search" (ngModelChange)="reload()" /></div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="actionFilter" (ngModelChange)="reload()">
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATE_BUDGET">Create Budget</option>
            <option value="UPDATE_BUDGET">Update Budget</option>
            <option value="CREATE_EXPENDITURE">Create Expenditure</option>
            <option value="UPDATE_EXPENDITURE">Update Expenditure</option>
            <option value="RESOLVE_ALERT">Resolve Alert</option>
            <option value="CREATE_USER">Create User</option>
            <option value="UPDATE_USER">Update User</option>
            <option value="DELETE_USER">Delete User</option>
            <option value="GENERATE_REPORT">Generate Report</option>
            <option value="UPDATE_RULE">Update Rule</option>
          </select>
        </div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="entityFilter" (ngModelChange)="reload()">
            <option value="">All Entities</option>
            <option>User</option><option>Department</option><option>Budget</option>
            <option>Expenditure</option><option>Alert</option><option>ThresholdRule</option><option>Report</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
      <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

      <div class="table-wrap" *ngIf="!loading() && !error()">
        <table class="table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP Address</th></tr></thead>
          <tbody>
            <tr *ngFor="let l of logs">
              <td class="muted mono" style="white-space:nowrap;">{{ l.createdAt | date:'dd MMM yy, HH:mm:ss' }}</td>
              <td><strong>{{ l.userName || 'System' }}</strong></td>
              <td><span class="badge" [ngClass]="badgeFor(l.action)">{{ l.action }}</span></td>
              <td class="muted">{{ l.entity }}</td>
              <td style="max-width:420px;">{{ l.details }}</td>
              <td class="mono muted">{{ l.ipAddress || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="!logs.length"><div class="big-icon">📜</div><p>No audit logs found.</p></div>
        <div class="pager" *ngIf="total > limit">
          <span>Page {{ page }} · {{ total }} entries</span>
          <div>
            <button class="btn btn-secondary btn-sm" [disabled]="page <= 1" (click)="goPage(page - 1)">← Prev</button>
            <button class="btn btn-secondary btn-sm" style="margin-left:6px;" [disabled]="page * limit >= total" (click)="goPage(page + 1)">Next →</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  loading = signal(true);
  error = signal('');
  search = ''; actionFilter = ''; entityFilter = '';
  page = 1; limit = 15; total = 0;

  constructor(private service: AuditService) {}
  ngOnInit() { this.load(); }

  reload() { this.page = 1; this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.service.list({ search: this.search, action: this.actionFilter, entity: this.entityFilter, page: this.page, limit: this.limit }).subscribe({
      next: (res) => { this.logs = res.data.items; this.total = res.data.total; this.loading.set(false); },
      error: () => { this.error.set('Unable to load audit logs.'); this.loading.set(false); },
    });
  }
  goPage(p: number) { this.page = p; this.load(); }

  badgeFor(action: string): string {
    if (action.includes('DELETE')) return 'badge-red';
    if (action.includes('CREATE')) return 'badge-green';
    if (action.includes('UPDATE') || action.includes('RESOLVE')) return 'badge-yellow';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'badge-blue';
    return 'badge-cyan';
  }
}
