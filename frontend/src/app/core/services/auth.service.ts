import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiResponse, Role, User } from '../models/models';

const API = 'http://localhost:5000/api';
const TOKEN_KEY = 'bums_token';
const USER_KEY = 'bums_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSignal = signal<User | null>(this.loadStoredUser());
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => !!this.currentUserSignal() && !!localStorage.getItem(TOKEN_KEY));

  constructor(private http: HttpClient, private router: Router) {}

  private loadStoredUser(): User | null {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  }

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }

  login(email: string, password: string) {
    return this.http.post<ApiResponse<{ token: string; user: User }>>(`${API}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          localStorage.setItem(TOKEN_KEY, res.data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          this.currentUserSignal.set(res.data.user);
        }
      })
    );
  }

  loadMe() {
    return this.http.get<ApiResponse<User>>(`${API}/auth/me`).pipe(
      tap((res) => {
        if (res.success && res.data) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
          this.currentUserSignal.set(res.data);
        }
      })
    );
  }

  logout(silent = false) {
    if (!silent) this.http.post(`${API}/auth/logout`, {}).subscribe({ error: () => {} });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]): boolean {
    const user = this.currentUserSignal();
    return !!user && roles.includes(user.role);
  }

  homeRoute(): string {
    const user = this.currentUserSignal();
    switch (user?.role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'FINANCE_OFFICER': return '/finance/dashboard';
      case 'DEPARTMENT_HEAD': return '/department/dashboard';
      default: return '/login';
    }
  }
}
