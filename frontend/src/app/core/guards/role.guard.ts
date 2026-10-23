import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/models';

export const roleGuard = (roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (user && roles.includes(user.role)) return true;
  router.navigate([auth.homeRoute()]);
  return false;
};
