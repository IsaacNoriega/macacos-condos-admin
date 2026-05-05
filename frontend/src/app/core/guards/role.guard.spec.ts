import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '../api.models';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let currentRole: UserRole | null = null;

  const authServiceMock = {
    role: () => currentRole,
  };

  beforeEach(() => {
    currentRole = null;

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    });
  });

  const execute = (roles?: UserRole[]) => {
    const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(route, {} as any));
  };

  it('allows navigation when route does not declare roles', () => {
    currentRole = null;

    const result = execute(undefined);

    expect(result).toBe(true);
  });

  it('allows superadmin in superadmin-only routes', () => {
    currentRole = 'superadmin';

    const result = execute(['superadmin']);

    expect(result).toBe(true);
  });

  it('blocks admin in superadmin-only routes and redirects to dashboard', () => {
    currentRole = 'admin';

    const result = execute(['superadmin']);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('allows residente in shared routes', () => {
    currentRole = 'residente';

    const result = execute(['superadmin', 'admin', 'residente', 'familiar']);

    expect(result).toBe(true);
  });

  it('blocks familiar in admin-only routes', () => {
    currentRole = 'familiar';

    const result = execute(['superadmin', 'admin']);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
