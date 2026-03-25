import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { UserRole } from '../api.models';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];

  if (!allowedRoles.length) {
    return true;
  }

  const currentRole = auth.role();
  if (currentRole && allowedRoles.includes(currentRole)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
