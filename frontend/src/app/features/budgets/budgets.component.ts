import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BudgetService, DepartmentService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Budget, Department } from '../../core/models/models';
import { InrPipe, PercentPipe } from '../../shared/pipes/inr.pipe';
import { levelBadge, levelBar, statusBadge } from '../../shared/ui.utils';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InrPipe, PercentPipe],
  template: `
  <div class="page-header">
    <div><h2>Budget Management</h2><div class="sub">Allocated budgets with automatic utilization calculation</div></div>
    <button class="btn btn-primary" *ngIf="auth.hasRole('ADMIN')" (click)="openForm()">+ Add Budget</button>
  </div>

  <div class="card">
    <div class="card-body">
      <div class="filters">
        <div class="form-group"><input class="form-control" placeholder="Search category…" [(ngModel)]="search" (ngModelChange)="load()" /></div>
        <div class="form-group" *ngIf="auth.hasRole('ADMIN','FINANCE_OFFICER')">
          <select class="form-control" [(ngModel)]="deptFilter" (ngModelChange)="load()">
            <option value="">All Departments</option>
            <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="fyFilter" (ngModelChange)="load()">
            <option value="">All Financial Years</option>
            <option *ngFor="let fy of financialYears" [value]="fy">{{ fy }}</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
      <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

      <div class="table-wrap" *ngIf="!loading() && !error()">
        <table class="table">
          <thead><tr>
            <th>Department</th><th>Financial Year</th><th>Category</th>
            <th class="num">Allocated</th><th class="num">Utilized</th><th class="num">Remaining</th>
            <th style="min-width:160px;">Utilization %</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let b of budgets">
              <td>{{ deptName(b) }}</td>
              <td class="mono">{{ b.financialYear }}</td>
              <td><strong>{{ b.category }}</strong></td>
              <td class="num">{{ b.allocatedAmount | inr }}</td>
              <td class="num">{{ (b.totalSpent || 0) | inr }}</td>
              <td class="num" [style.color]="(b.remaining || 0) < 0 ? '#dc2626' : 'inherit'">{{ b.remaining | inr }}</td>
              <td>
                <div class="util-cell">
                  <div class="progress"><div class="{{ levelBar(b.statusLevel) }}" [style.width.%]="min(b.utilization || 0, 100)"></div></div>
                  <span>{{ b.utilization | pct }}</span>
                </div>
              </td>
              <td><span class="badge" [ngClass]="levelBadge(b.statusLevel)">{{ b.statusLevel }}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="viewDetails(b)">View</button>
                <button class="btn btn-secondary btn-sm" style="margin-left:6px;" *ngIf="auth.hasRole('ADMIN')" (click)="openForm(b)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="!budgets.length"><div class="big-icon">💼</div><p>No budgets found.</p></div>
      </div>
    </div>
  </div>

  <!-- Add/Edit -->
  <div class="modal-backdrop" *ngIf="showForm">
    <div class="modal">
      <div class="modal-head"><h3>{{ editing ? 'Edit Budget' : 'Add Budget' }}</h3><button class="close-x" (click)="showForm = false">×</button></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="modal-body">
          <div class="login-error" *ngIf="formError">{{ formError }}</div>
          <div class="form-group" *ngIf="!editing"><label>Department *</label>
            <select class="form-control" formControlName="departmentId"><option value="">— Select —</option><option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option></select>
            <div class="form-error" *ngIf="f.departmentId.touched && f.departmentId.invalid">Department is required.</div>
          </div>
          <div class="grid grid-2">
            <div class="form-group"><label>Financial Year *</label><input class="form-control" formControlName="financialYear" placeholder="2025-26" /><div class="form-error" *ngIf="f.financialYear.touched && f.financialYear.invalid">Required.</div></div>
            <div class="form-group"><label>Category *</label><input class="form-control" formControlName="category" placeholder="e.g. Infrastructure" /><div class="form-error" *ngIf="f.category.touched && f.category.invalid">Required.</div></div>
          </div>
          <div class="form-group"><label>Allocated Amount (₹) *</label><input class="form-control" type="number" formControlName="allocatedAmount" min="1" /><div class="form-error" *ngIf="f.allocatedAmount.touched && f.allocatedAmount.invalid">Amount must be greater than zero.</div></div>
          <div class="form-group"><label>Description</label><textarea class="form-control" rows="2" formControlName="description"></textarea></div>
          <div class="form-group"><label>Approved By</label><input class="form-control" formControlName="approvedBy" placeholder="e.g. Budget Allocation Committee" /></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" (click)="showForm = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Budget' }}</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Details -->
  <div class="modal-backdrop" *ngIf="detail">
    <div class="modal">
      <div class="modal-head"><h3>Budget Details — {{ detail.category }}</h3><button class="close-x" (click)="detail = null">×</button></div>
      <div class="modal-body">
        <div class="detail-row"><span class="lbl">Department</span><span class="val">{{ deptName(detail) }}</span></div>
        <div class="detail-row"><span class="lbl">Financial Year</span><span class="val">{{ detail.financialYear }}</span></div>
        <div class="detail-row"><span class="lbl">Allocated</span><span class="val">{{ detail.allocatedAmount | inr }}</span></div>
        <div class="detail-row"><span class="lbl">Utilized</span><span class="val">{{ (detail.totalSpent || 0) | inr }}</span></div>
        <div class="detail-row"><span class="lbl">Remaining</span><span class="val">{{ detail.remaining | inr }}</span></div>
        <div class="detail-row"><span class="lbl">Utilization</span><span class="val">{{ detail.utilization | pct }} ({{ detail.statusLevel }})</span></div>
        <div class="detail-row"><span class="lbl">Approved By</span><span class="val">{{ detail.approvedBy || '—' }}</span></div>
        <div class="detail-row"><span class="lbl">Description</span><span class="val">{{ detail.description || '—' }}</span></div>
        <h4 class="section-title" style="margin-top:18px;">Expenditures against this budget</h4>
        <table class="table" *ngIf="detail.expenditures?.length">
          <thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th></tr></thead>
          <tbody><tr *ngFor="let e of detail.expenditures"><td class="muted">{{ e.date | date:'dd MMM yy' }}</td><td>{{ e.description }}</td><td class="num">{{ e.amount | inr }}</td></tr></tbody>
        </table>
        <p class="muted" *ngIf="!detail.expenditures?.length">No expenditures recorded.</p>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" (click)="detail = null">Close</button></div>
    </div>
  </div>
  `,
})
export class BudgetsComponent implements OnInit {
  budgets: Budget[] = [];
  departments: Department[] = [];
  financialYears: string[] = [];
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  search = ''; deptFilter = ''; fyFilter = '';
  showForm = false; editing: Budget | null = null; detail: any = null;
  formError = '';
  levelBadge = levelBadge; levelBar = levelBar; statusBadge = statusBadge;
  min = Math.min;

  form = this.fb.group({
    departmentId: ['', Validators.required],
    financialYear: ['2025-26', Validators.required],
    category: ['', Validators.required],
    allocatedAmount: [0, [Validators.required, Validators.min(1)]],
    description: [''],
    approvedBy: [''],
  });

  constructor(private budgetService: BudgetService, private deptService: DepartmentService,
    public auth: AuthService, private fb: FormBuilder) {}
  get f() { return this.form.controls; }

  ngOnInit() {
    if (this.auth.hasRole('ADMIN', 'FINANCE_OFFICER')) {
      this.deptService.list().subscribe(res => this.departments = res.data || []);
    } else {
      const d: any = this.auth.currentUser()?.departmentId;
      if (d && typeof d === 'object') this.departments = [d];
    }
    this.load();
  }

  load() {
    this.loading.set(true); this.error.set('');
    this.budgetService.list({ search: this.search, departmentId: this.deptFilter, financialYear: this.fyFilter }).subscribe({
      next: (res) => {
        this.budgets = res.data;
        this.financialYears = [...new Set(this.budgets.map(b => b.financialYear))].sort().reverse();
        if (this.fyFilter) this.financialYears = [...new Set([...this.financialYears, this.fyFilter])].sort().reverse();
        this.loading.set(false);
      },
      error: () => { this.error.set('Unable to load budgets.'); this.loading.set(false); },
    });
  }

  deptName(b: Budget): string {
    const d: any = b.departmentId;
    return d && typeof d === 'object' ? d.name : '—';
  }

  openForm(b?: Budget) {
    this.editing = b || null; this.formError = '';
    if (b) {
      const d: any = b.departmentId;
      this.form.patchValue({
        departmentId: typeof d === 'object' ? d._id : d,
        financialYear: b.financialYear, category: b.category,
        allocatedAmount: b.allocatedAmount, description: b.description, approvedBy: b.approvedBy || '',
      });
      this.form.get('departmentId')!.disable();
    } else {
      this.form.get('departmentId')!.enable();
      this.form.reset({ departmentId: '', financialYear: '2025-26', category: '', allocatedAmount: 0, description: '', approvedBy: '' });
    }
    this.showForm = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError = '';
    const body: any = { ...this.form.value, departmentId: this.form.getRawValue().departmentId };
    const req = this.editing ? this.budgetService.update(this.editing._id, body) : this.budgetService.create(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.load(); },
      error: (err) => { this.saving.set(false); this.formError = err?.error?.message || 'Budget could not be saved.'; },
    });
  }

  viewDetails(b: Budget) {
    this.budgetService.get(b._id).subscribe({
      next: (res) => this.detail = res.data,
      error: () => alert('Unable to load budget details.'),
    });
  }
}
