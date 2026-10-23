import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, DepartmentService } from '../../core/services/data.service';
import { User, Department, Role } from '../../core/models/models';
import { roleLabel, statusBadge } from '../../shared/ui.utils';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
  <div class="page-header">
    <div><h2>User Management</h2><div class="sub">Create and manage system users, roles and department assignments</div></div>
    <button class="btn btn-primary" (click)="openForm()">+ Add User</button>
  </div>

  <div class="card">
    <div class="card-body">
      <div class="filters">
        <div class="form-group"><input class="form-control" placeholder="Search name or email…" [ngModel]="search" (ngModelChange)="onSearch($event)" [ngModelOptions]="{standalone:true}" /></div>
        <div class="form-group"><select class="form-control" (change)="onFilter('role', $event)"><option value="">All Roles</option><option value="ADMIN">Admin</option><option value="FINANCE_OFFICER">Finance Officer</option><option value="DEPARTMENT_HEAD">Department Head</option></select></div>
        <div class="form-group"><select class="form-control" (change)="onFilter('status', $event)"><option value="">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
      </div>

      <div *ngIf="loading()" class="loading-state"><div class="spinner"></div></div>
      <div *ngIf="error()" class="error-state"><div class="big-icon">⚠️</div><p>{{ error() }}</p></div>

      <div class="table-wrap" *ngIf="!loading() && !error()">
        <table class="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let u of users">
              <td><strong>{{ u.name }}</strong></td>
              <td class="muted">{{ u.email }}</td>
              <td><span class="badge" [ngClass]="u.role === 'ADMIN' ? 'badge-violet' : u.role === 'FINANCE_OFFICER' ? 'badge-cyan' : 'badge-blue'">{{ roleLabel(u.role) }}</span></td>
              <td>{{ deptName(u) }}</td>
              <td><span class="badge" [ngClass]="statusBadge(u.status)">{{ u.status }}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="openForm(u)">Edit</button>
                <button class="btn btn-danger btn-sm" style="margin-left:6px;" (click)="askDelete(u)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="!users.length"><div class="big-icon">👥</div><p>No users found.</p></div>
        <div class="pager" *ngIf="total > limit">
          <span>Showing {{ users.length }} of {{ total }} users</span>
          <div>
            <button class="btn btn-secondary btn-sm" [disabled]="page <= 1" (click)="goPage(page - 1)">← Prev</button>
            <span style="margin:0 10px;">Page {{ page }}</span>
            <button class="btn btn-secondary btn-sm" [disabled]="page * limit >= total" (click)="goPage(page + 1)">Next →</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit modal -->
  <div class="modal-backdrop" *ngIf="showForm">
    <div class="modal">
      <div class="modal-head"><h3>{{ editing ? 'Edit User' : 'Add User' }}</h3><button class="close-x" (click)="showForm = false">×</button></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="modal-body">
          <div class="login-error" *ngIf="formError">{{ formError }}</div>
          <div class="form-group"><label>Name *</label><input class="form-control" formControlName="name" [class.invalid]="f.name.touched && f.name.invalid" /><div class="form-error" *ngIf="f.name.touched && f.name.invalid">Name is required.</div></div>
          <div class="form-group"><label>Email *</label><input class="form-control" type="email" formControlName="email" [class.invalid]="f.email.touched && f.email.invalid" /><div class="form-error" *ngIf="f.email.touched && f.email.errors?.required">Email is required.</div><div class="form-error" *ngIf="f.email.touched && f.email.errors?.email">Invalid email.</div></div>
          <div class="form-group"><label>Password {{ editing ? '(leave blank to keep current)' : '*' }}</label><input class="form-control" type="password" formControlName="password" [class.invalid]="f.password.touched && f.password.invalid" /><div class="form-error" *ngIf="f.password.touched && f.password.errors?.minlength">Minimum 6 characters.</div></div>
          <div class="grid grid-2">
            <div class="form-group"><label>Role *</label>
              <select class="form-control" formControlName="role">
                <option value="ADMIN">Admin</option><option value="FINANCE_OFFICER">Finance Officer</option><option value="DEPARTMENT_HEAD">Department Head</option>
              </select>
            </div>
            <div class="form-group"><label>Department</label>
              <select class="form-control" formControlName="departmentId">
                <option value="">— None —</option>
                <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label>Status</label>
            <select class="form-control" formControlName="status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" (click)="showForm = false">Cancel</button>
          <button class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : editing ? 'Update User' : 'Create User' }}</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete confirm -->
  <div class="modal-backdrop" *ngIf="deleting">
    <div class="modal" style="max-width:420px;">
      <div class="modal-head"><h3>Delete User</h3><button class="close-x" (click)="deleting = null">×</button></div>
      <div class="modal-body"><p>Are you sure you want to delete <strong>{{ deleting.name }}</strong>? This action cannot be undone.</p></div>
      <div class="modal-foot">
        <button class="btn btn-secondary" (click)="deleting = null">Cancel</button>
        <button class="btn btn-danger" (click)="confirmDelete()">Delete User</button>
      </div>
    </div>
  </div>
  `,
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  departments: Department[] = [];
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  roleLabel = roleLabel; statusBadge = statusBadge;

  search = '';
  roleFilter = '';
  statusFilter = '';
  page = 1;
  limit = 10;
  total = 0;

  showForm = false;
  editing: User | null = null;
  deleting: User | null = null;
  formError = '';

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    role: ['DEPARTMENT_HEAD' as Role, Validators.required],
    departmentId: [''],
    status: ['ACTIVE'],
  });

  constructor(private usersService: UserService, private deptService: DepartmentService, private fb: FormBuilder) {}

  get f() { return this.form.controls; }

  ngOnInit() {
    this.deptService.list().subscribe(res => this.departments = res.data || []);
    this.load();
  }

  load() {
    this.loading.set(true); this.error.set('');
    this.usersService.list({ search: this.search, role: this.roleFilter, status: this.statusFilter, page: this.page, limit: this.limit }).subscribe({
      next: (res) => { this.users = res.data.items; this.total = res.data.total; this.loading.set(false); },
      error: () => { this.error.set('Unable to load users.'); this.loading.set(false); },
    });
  }

  onSearch(v: string) { this.search = v; this.page = 1; this.load(); }
  onFilter(key: 'role' | 'status', e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    if (key === 'role') this.roleFilter = v; else this.statusFilter = v;
    this.page = 1; this.load();
  }
  goPage(p: number) { this.page = p; this.load(); }

  deptName(u: User): string {
    const d: any = u.departmentId;
    return d && typeof d === 'object' ? d.name : '—';
  }

  openForm(user?: User) {
    this.editing = user || null;
    this.formError = '';
    if (user) {
      const d: any = user.departmentId;
      this.form.patchValue({
        name: user.name, email: user.email, password: '', role: user.role,
        departmentId: d && typeof d === 'object' ? d._id : (d || ''), status: user.status,
      });
    } else {
      this.form.reset({ name: '', email: '', password: '', role: 'DEPARTMENT_HEAD', departmentId: '', status: 'ACTIVE' });
      this.form.get('password')!.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('password')!.updateValueAndValidity();
    }
    this.showForm = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError = '';
    const body: any = { ...this.form.value };
    if (!body.password) delete body.password;
    const req = this.editing
      ? this.usersService.update(this.editing._id, body)
      : this.usersService.create(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.load(); },
      error: (err) => { this.saving.set(false); this.formError = err?.error?.message || 'User could not be saved.'; },
    });
  }

  askDelete(u: User) { this.deleting = u; }
  confirmDelete() {
    if (!this.deleting) return;
    this.usersService.remove(this.deleting._id).subscribe({
      next: () => { this.deleting = null; this.load(); },
      error: (err) => { this.formError = err?.error?.message || 'Delete failed.'; this.deleting = null; },
    });
  }
}