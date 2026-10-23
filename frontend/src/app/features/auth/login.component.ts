import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="brand-logo">₹</div>
        <h1>Budget Utilization Monitoring System</h1>
        <p>AI-Based Anomaly Detection · Government Financial Intelligence</p>
      </div>
      <div class="login-body">
        <div class="login-error" *ngIf="error()">{{ error() }}</div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input id="email" class="form-control" type="email" formControlName="email" placeholder="you@budget.gov" [class.invalid]="f.email.touched && f.email.invalid" />
            <div class="form-error" *ngIf="f.email.touched && f.email.errors?.required">Email is required.</div>
            <div class="form-error" *ngIf="f.email.touched && f.email.errors?.email">Enter a valid email address.</div>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input id="password" class="form-control" type="password" formControlName="password" placeholder="••••••••" [class.invalid]="f.password.touched && f.password.invalid" />
            <div class="form-error" *ngIf="f.password.touched && f.password.errors?.required">Password is required.</div>
          </div>
          <button class="btn btn-primary" style="width:100%; justify-content:center; padding:11px;" [disabled]="loading() || form.invalid">
            <span *ngIf="!loading()">Sign In</span>
            <span *ngIf="loading()">Signing in…</span>
          </button>
        </form>
        <div class="login-demo">
          <strong>Demo accounts</strong> (password: <code>Admin&#64;123</code>)<br>
          Admin: <code>admin&#64;budget.gov</code> · Finance: <code>finance&#64;budget.gov</code> · Dept Head: <code>head&#64;budget.gov</code>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class LoginComponent {
  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate([this.auth.homeRoute()]),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Unable to login. Please check your credentials.');
      },
    });
  }
}
