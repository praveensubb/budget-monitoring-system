import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ExpenditureService, BudgetService, DepartmentService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Expenditure, Budget, Department } from '../../core/models/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { statusBadge } from '../../shared/ui.utils';

@Component({
  selector: 'app-expenditures',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InrPipe],
  template: `
  <div class="page-header">
    <div><h2>Expenditure Management</h2><div class="sub">Record and track departmental spending against allocated budgets</div></div>
    <button class="btn btn-primary" (click)="openForm()">+ Record Expenditure</button>
  </div>

  <div class="alert-banner warning" *ngIf="lastMessage"><span style="font-size:16px;">ℹ️</span><div>{{ lastMessage }}</div></div>

  <div class="card">
    <div class="card-body">
      <div class="filters">
        <div class="form-group"><input class="form-control" placeholder="Search description, vendor, invoice…" [(ngModel)]="search" (ngModelChange)="reload()" /></div>
        <div class="form-group" *ngIf="auth.hasRole('ADMIN','FINANCE_OFFICER')">
          <select class="form-control" [(ngModel)]="deptFilter" (ngModelChange)="reload()">
            <option value="">All Departments</option>
            <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="categoryFilter" (ngModelChange)="reload()">
            <option value="">All Categories</option>
            <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <select class="form-control" [(ngModel)]="sortBy" (ngModelChange)="reload()">
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
      <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

      <div class="table-wrap" *ngIf="!loading() && !error()">
        <table class="table">
          <thead><tr>
            <th>Date</th><th>Description</th><th>Department</th><th>Budget</th><th>Vendor</th>
            <th>Invoice</th><th class="num">Amount</th><th>Status</th>
            <th *ngIf="auth.hasRole('ADMIN','FINANCE_OFFICER')">Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let e of expenditures">
              <td class="muted">{{ e.date | date:'dd MMM yyyy' }}</td>
              <td><strong>{{ e.description }}</strong></td>
              <td>{{ deptName(e) }}</td>
              <td>{{ budgetName(e) }}</td>
              <td class="muted">{{ e.vendor || '—' }}</td>
              <td class="mono muted">{{ e.invoiceNumber || '—' }}</td>
              <td class="num"><strong>{{ e.amount | inr }}</strong></td>
              <td><span class="badge" [ngClass]="statusBadge(e.status)">{{ e.status }}</span></td>
              <td *ngIf="auth.hasRole('ADMIN','FINANCE_OFFICER')">
                <button class="btn btn-secondary btn-sm" (click)="openForm(e)">Edit</button>
                <button class="btn btn-danger btn-sm" style="margin-left:6px;" *ngIf="auth.hasRole('ADMIN')" (click)="askDelete(e)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="!expenditures.length"><div class="big-icon">🧾</div><p>No expenditures found.</p></div>
        <div class="pager" *ngIf="total > limit">
          <span>Showing page {{ page }} of {{ pages() }}</span>
          <div>
            <button class="btn btn-secondary btn-sm" [disabled]="page <= 1" (click)="goPage(page - 1)">← Prev</button>
            <span style="margin:0 10px;">{{ total }} records</span>
            <button class="btn btn-secondary btn-sm" [disabled]="page * limit >= total" (click)="goPage(page + 1)">Next →</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" *ngIf="showForm">
    <div class="modal">
      <div class="modal-head"><h3>{{ editing ? 'Edit Expenditure' : 'Record Expenditure' }}</h3><button class="close-x" (click)="showForm = false">×</button></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="modal-body">
          <div class="login-error" *ngIf="formError">{{ formError }}</div>
          <div class="grid grid-2">
            <div class="form-group"><label>Department *</label>
              <select class="form-control" formControlName="departmentId" (change)="onDeptChange()">
                <option value="">— Select —</option>
                <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
              </select>
              <div class="form-error" *ngIf="f.departmentId.touched && f.departmentId.invalid">Department is required.</div>
            </div>
            <div class="form-group"><label>Budget *</label>
              <select class="form-control" formControlName="budgetId" (change)="onBudgetChange()">
                <option value="">— Select —</option>
                <option *ngFor="let b of deptBudgets" [value]="b._id">{{ b.category }} · {{ b.financialYear }} ({{ b.allocatedAmount | inr }})</option>
              </select>
              <div class="form-error" *ngIf="f.budgetId.touched && f.budgetId.invalid">Budget is required.</div>
            </div>
          </div>
          <div class="explanation-box" *ngIf="selectedBudget">
            <strong>Selected budget:</strong> {{ selectedBudget.allocatedAmount | inr }} allocated ·
            {{ (selectedBudget.totalSpent || 0) | inr }} utilized ·
            <strong>{{ (selectedBudget.remaining ?? selectedBudget.allocatedAmount) | inr }} remaining</strong>
          </div>
          <div class="grid grid-2">
            <div class="form-group"><label>Amount (₹) *</label><input class="form-control" type="number" formControlName="amount" min="1" /><div class="form-error" *ngIf="f.amount.touched && f.amount.invalid">Amount must be greater than zero.</div></div>
            <div class="form-group"><label>Date *</label><input class="form-control" type="date" formControlName="date" /><div class="form-error" *ngIf="f.date.touched && f.date.invalid">Date is required.</div></div>
          </div>
          <div class="form-group"><label>Description *</label><input class="form-control" formControlName="description" placeholder="Purpose of expenditure" /><div class="form-error" *ngIf="f.description.touched && f.description.invalid">Description is required.</div></div>
          <div class="grid grid-2">
            <div class="form-group"><label>Category *</label><input class="form-control" formControlName="category" placeholder="e.g. Infrastructure" /><div class="form-error" *ngIf="f.category.touched && f.category.invalid">Category is required.</div></div>
            <div class="form-group"><label>Vendor</label><input class="form-control" formControlName="vendor" /></div>
          </div>
          <div class="form-group"><label>Invoice Number</label><input class="form-control" formControlName="invoiceNumber" /></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" (click)="showForm = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : editing ? 'Update' : 'Record Expenditure' }}</button>
        </div>
      </form>
    </div>
  </div>

  <div class="modal-backdrop" *ngIf="deleting">
    <div class="modal" style="max-width:420px;">
      <div class="modal-head"><h3>Delete Expenditure</h3><button class="close-x" (click)="deleting = null">×</button></div>
      <div class="modal-body"><p>Delete this expenditure of <strong>{{ deleting?.amount | inr }}</strong>? Anomalies will be re-evaluated.</p></div>
      <div class="modal-foot">
        <button class="btn btn-secondary" (click)="deleting = null">Cancel</button>
        <button class="btn btn-danger" (click)="confirmDelete()">Delete</button>
      </div>
    </div>
  </div>
  `,
})
export class ExpendituresComponent implements OnInit {
  expenditures: Expenditure[] = [];
  departments: Department[] = [];
  allBudgets: Budget[] = [];
  deptBudgets: Budget[] = [];
  categories: string[] = [];
  selectedBudget: Budget | null = null;
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  search = ''; deptFilter = ''; categoryFilter = ''; sortBy = 'date';
  page = 1; limit = 10; total = 0;
  showForm = false; editing: Expenditure | null = null; deleting: Expenditure | null = null;
  formError = ''; lastMessage = '';
  statusBadge = statusBadge;

  form = this.fb.group({
    departmentId: ['', Validators.required],
    budgetId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    description: ['', Validators.required],
    category: ['', Validators.required],
    vendor: [''],
    invoiceNumber: [''],
  });

  constructor(private expService: ExpenditureService, private budgetService: BudgetService,
    private deptService: DepartmentService, public auth: AuthService, private fb: FormBuilder) {}
  get f() { return this.form.controls; }

  ngOnInit() {
    this.budgetService.list().subscribe(res => {
      this.allBudgets = res.data || [];
      this.categories = [...new Set(this.allBudgets.map(b => b.category))].sort();
    });
    if (this.auth.hasRole('ADMIN', 'FINANCE_OFFICER')) {
      this.deptService.list().subscribe(res => this.departments = res.data || []);
    } else {
      const d: any = this.auth.currentUser()?.departmentId;
      if (d && typeof d === 'object') this.departments = [d];
    }
    this.load();
  }

  pages() { return Math.max(1, Math.ceil(this.total / this.limit)); }
  reload() { this.page = 1; this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.expService.list({
      search: this.search, departmentId: this.deptFilter, category: this.categoryFilter,
      sortBy: this.sortBy, page: this.page, limit: this.limit,
    }).subscribe({
      next: (res) => { this.expenditures = res.data.items; this.total = res.data.total; this.loading.set(false); },
      error: () => { this.error.set('Unable to load expenditures.'); this.loading.set(false); },
    });
  }

  goPage(p: number) { this.page = p; this.load(); }

  deptName(e: Expenditure): string {
    const d: any = e.departmentId;
    return d && typeof d === 'object' ? d.name : '—';
  }
  budgetName(e: Expenditure): string {
    const b: any = e.budgetId;
    return b && typeof b === 'object' ? `${b.category} (${b.financialYear})` : '—';
  }

  openForm(e?: Expenditure) {
    this.editing = e || null; this.formError = ''; this.lastMessage = '';
    this.deptBudgets = [];
    this.selectedBudget = null;
    if (e) {
      const d: any = e.departmentId; const b: any = e.budgetId;
      const deptId = typeof d === 'object' ? d._id : d;
      this.deptBudgets = this.allBudgets.filter(x => String((x.departmentId as any)?._id ?? x.departmentId) === String(deptId));
      this.selectedBudget = typeof b === 'object' ? b : null;
      this.form.patchValue({
        departmentId: deptId,
        budgetId: typeof b === 'object' ? b._id : b,
        amount: e.amount, date: e.date.slice(0, 10), description: e.description,
        category: e.category, vendor: e.vendor, invoiceNumber: e.invoiceNumber,
      });
    } else {
      const firstDept = this.departments.length === 1 ? this.departments[0]._id : '';
      this.form.reset({ departmentId: firstDept, budgetId: '', amount: 0, date: new Date().toISOString().slice(0, 10), description: '', category: '', vendor: '', invoiceNumber: '' });
      if (firstDept) this.onDeptChange();
    }
    this.showForm = true;
  }

  onDeptChange() {
    const deptId = this.form.value.departmentId;
    this.deptBudgets = this.allBudgets.filter(x => String((x.departmentId as any)?._id ?? x.departmentId) === String(deptId));
    this.form.patchValue({ budgetId: '' });
    this.selectedBudget = null;
  }

  onBudgetChange() {
    this.selectedBudget = this.deptBudgets.find(b => b._id === this.form.value.budgetId) || null;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError = '';
    const body: any = { ...this.form.value };
    const req = this.editing ? this.expService.update(this.editing._id, body) : this.expService.create(body);
    req.subscribe({
      next: (res) => {
        this.saving.set(false); this.showForm = false;
        this.lastMessage = res.message;
        setTimeout(() => this.lastMessage = '', 6000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError = err?.error?.message || 'Expenditure could not be saved.';
      },
    });
  }

  askDelete(e: Expenditure) { this.deleting = e; }
  confirmDelete() {
    if (!this.deleting) return;
    this.expService.remove(this.deleting._id).subscribe({
      next: () => { this.deleting = null; this.load(); },
      error: (err) => { alert(err?.error?.message || 'Delete failed.'); this.deleting = null; },
    });
  }
}
