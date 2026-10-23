import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RulesService } from '../../core/services/data.service';
import { ThresholdRule } from '../../core/models/models';
import { severityBadge } from '../../shared/ui.utils';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page-header">
    <div><h2>Monitoring Rules & Thresholds</h2><div class="sub">Configure the analytical rules that drive anomaly detection and alerting</div></div>
  </div>

  <div class="alert-banner warning">
    <span style="font-size:16px;">⚙️</span>
    <div>Changes take effect immediately. The next expenditure event or analysis run will use the updated thresholds.</div>
  </div>

  <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
  <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

  <div class="grid grid-2" *ngIf="!loading() && !error()">
    <div class="card" *ngFor="let r of rules">
      <div class="card-body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h3 style="margin:0 0 4px; font-size:15px;">{{ r.name }}</h3>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
              <span class="badge badge-cyan">{{ r.type }}</span>
              <span class="badge" [ngClass]="severityBadge(r.severity)">{{ r.severity }}</span>
              <span class="badge" [ngClass]="r.enabled ? 'badge-green' : 'badge-gray'">{{ r.enabled ? 'ENABLED' : 'DISABLED' }}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:26px; font-weight:800; color:var(--primary);">{{ r.threshold }}<span style="font-size:13px; color:var(--muted);">%</span></div>
          </div>
        </div>
        <p class="muted" style="font-size:12.5px; margin:0 0 14px; line-height:1.5;">{{ r.description }}</p>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Threshold (%)</label>
          <input type="number" class="form-control" min="0" max="100" [(ngModel)]="draft[r._id]" />
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary btn-sm" [disabled]="saving() || draft[r._id] === r.threshold" (click)="saveThreshold(r)">Save Threshold</button>
          <button class="btn btn-sm" [ngClass]="r.enabled ? 'btn-danger' : 'btn-secondary'" (click)="toggle(r)">
            {{ r.enabled ? 'Disable' : 'Enable' }}
          </button>
        </div>
        <div class="form-error" *ngIf="errors[r._id]">{{ errors[r._id] }}</div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:20px;">
    <div class="card-header"><h3>Rule Reference</h3></div>
    <div class="card-body">
      <div class="detail-row"><span class="lbl">Rule 1 — Utilization ≥ warning threshold</span><span class="val">YELLOW warning alert</span></div>
      <div class="detail-row"><span class="lbl">Rule 2 — Utilization ≥ high-risk threshold</span><span class="val">ORANGE high-risk alert</span></div>
      <div class="detail-row"><span class="lbl">Rule 3 — Utilization ≥ 100%</span><span class="val">RED critical / over-budget alert</span></div>
      <div class="detail-row"><span class="lbl">Rule 4 — Single transaction &gt; large-transaction % of budget</span><span class="val">Large transaction alert</span></div>
      <div class="detail-row"><span class="lbl">Rule 5 — ≥3 transactions &gt;10% of budget within 7 days</span><span class="val">Suspicious spending alert</span></div>
      <div class="detail-row"><span class="lbl">Rule 6 — Utilization &lt; minimum near FY end</span><span class="val">Under-utilization alert</span></div>
      <div class="detail-row"><span class="lbl">Rule 7 — Expenditure exceeds remaining budget</span><span class="val">Blocked + critical alert on updates</span></div>
    </div>
  </div>
  `,
})
export class RulesComponent implements OnInit {
  rules: ThresholdRule[] = [];
  draft: Record<string, number> = {};
  errors: Record<string, string> = {};
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  severityBadge = severityBadge;

  constructor(private service: RulesService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.service.list().subscribe({
      next: (res) => {
        this.rules = res.data;
        this.draft = {};
        for (const r of this.rules) this.draft[r._id] = r.threshold;
        this.loading.set(false);
      },
      error: () => { this.error.set('Unable to load rules.'); this.loading.set(false); },
    });
  }

  saveThreshold(r: ThresholdRule) {
    this.errors[r._id] = '';
    const t = Number(this.draft[r._id]);
    if (isNaN(t) || t < 0 || t > 100) { this.errors[r._id] = 'Threshold must be between 0 and 100.'; return; }
    this.saving.set(true);
    this.service.update(r._id, { threshold: t }).subscribe({
      next: () => { this.saving.set(false); this.load(); },
      error: (err) => { this.saving.set(false); this.errors[r._id] = err?.error?.message || 'Update failed.'; },
    });
  }

  toggle(r: ThresholdRule) {
    this.service.update(r._id, { enabled: !r.enabled }).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message || 'Update failed.'),
    });
  }
}
