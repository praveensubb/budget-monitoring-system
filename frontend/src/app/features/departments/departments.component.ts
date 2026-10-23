import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentService } from '../../core/services/data.service';
import { Department } from '../../core/models/models';
import { statusBadge } from '../../shared/ui.utils';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
  <div class="page-header">
    <div><h2>Department Management</h2><div class="sub">Organizational units with budget allocation responsibility</div></div>
    <button class="btn btn-primary" (click)="openForm()">+ Add Department</button>
  </div>

  <div class="card">
    <div class="card-body">
      <div class="filters">
        <div class="form-group"><input class="form-control" placeholder="Search departments…" [ngModel]="search" (ngModelChange)="onSearch($event)" [ngModelOptions]="{standalone:true}" /></div>
        <div class="form-group"><select class="form-control" (change)="onStatus($event)"><option value="">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
      </div>

      <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
      <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

      <div class="table-wrap" *ngIf="!loading() && !error()">
        <table class="table">
          <thead><tr><th>Code</th><th>Department</th><th>Department Head</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let d of departments">
              <td><span class="badge badge-blue mono">{{ d.code }}</span></td>
              <td><strong>{{ d.name }}</strong></td>
              <td>{{ d.head }}</td>
              <td class="muted" style="max-width:320px;">{{ d.description }}</td>
              <td><span class="badge" [ngClass]="statusBadge(d.status)">{{ d.status }}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="openForm(d)">Edit</button>
                <button class="btn btn-danger btn-sm" style="margin-left:6px;" (click)="askDelete(d)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="!departments.length"><div class="big-icon">🏛️</div><p>No departments found.</p></div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" *ngIf="showForm">
    <div class="modal">
      <div class="modal-head"><h3>{{ editing ? 'Edit Department' : 'Add Department' }}</h3><button class="close-x" (click)="showForm = false">×</button></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="modal-body">
          <div class="login-error" *ngIf="formError">{{ formError }}</div>
          <div class="form-group"><label>Department Name *</label><input class="form-control" formControlName="name" /><div class="form-error" *ngIf="f.name.touched && f.name.invalid">Name is required.</div></div>
          <div class="grid grid-2">
            <div class="form-group"><label>Code *</label><input class="form-control" formControlName="code" placeholder="e.g. IT" style="text-transform:uppercase;" /><div class="form-error" *ngIf="f.code.touched && f.code.invalid">Code is required.</div></div>
            <div class="form-group"><label>Department Head *</label><input class="form-control" formControlName="head" /><div class="form-error" *ngIf="f.head.touched && f.head.invalid">Head is required.</div></div>
          </div>
          <div class="form-group"><label>Description</label><textarea class="form-control" rows="3" formControlName="description"></textarea></div>
          <div class="form-group"><label>Status</label><select class="form-control" formControlName="status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" (click)="showForm = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Department' }}</button>
        </div>
      </form>
    </div>
  </div>

  <div class="modal-backdrop" *ngIf="deleting">
    <div class="modal" style="max-width:420px;">
      <div class="modal-head"><h3>Delete Department</h3><button class="close-x" (click)="deleting = null">×</button></div>
      <div class="modal-body"><p>Delete <strong>{{ deleting.name }}</strong>? Departments with recorded budgets cannot be deleted.</p></div>
      <div class="modal-foot">
        <button class="btn btn-secondary" (click)="deleting = null">Cancel</button>
        <button class="btn btn-danger" (click)="confirmDelete()">Delete</button>
      </div>
    </div>
  </div>
  `,
})
export class DepartmentsComponent implements OnInit {
  departments: Department[] = [];
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  statusBadge = statusBadge;
  search = '';
  statusFilter = '';
  showForm = false;
  editing: Department | null = null;
  deleting: Department | null = null;
  formError = '';

  form = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    head: ['', Validators.required],
    description: [''],
    status: ['ACTIVE'],
  });

  constructor(private service: DepartmentService, private fb: FormBuilder) {}
  get f() { return this.form.controls; }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.service.list({ search: this.search, status: this.statusFilter }).subscribe({
      next: (res) => { this.departments = res.data; this.loading.set(false); },
      error: () => { this.error.set('Unable to load departments.'); this.loading.set(false); },
    });
  }

  onSearch(v: string) { this.search = v; this.load(); }
  onStatus(e: Event) { this.statusFilter = (e.target as HTMLSelectElement).value; this.load(); }

  openForm(d?: Department) {
    this.editing = d || null;
    this.formError = '';
    if (d) this.form.patchValue(d);
    else this.form.reset({ name: '', code: '', head: '', description: '', status: 'ACTIVE' });
    this.showForm = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError = '';
    const req = this.editing ? this.service.update(this.editing._id, this.form.value) : this.service.create(this.form.value);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.load(); },
      error: (err) => { this.saving.set(false); this.formError = err?.error?.message || 'Department could not be saved.'; },
    });
  }

  askDelete(d: Department) { this.deleting = d; }
  confirmDelete() {
    if (!this.deleting) return;
    this.service.remove(this.deleting._id).subscribe({
      next: () => { this.deleting = null; this.load(); },
      error: (err) => { this.formError = err?.error?.message || 'Delete failed.'; this.deleting = null; alert(this.formError); },
    });
  }
}