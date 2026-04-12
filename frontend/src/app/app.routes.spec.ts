import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('app routes role matrix', () => {
  const rootRoute = routes.find((route) => route.path === '');
  const childRoutes = rootRoute?.children ?? [];

  const routeRoles = (path: string): string[] | undefined => {
    const route = childRoutes.find((child) => child.path === path);
    return route?.data?.['roles'] as string[] | undefined;
  };

  it('keeps tenants route as superadmin-only', () => {
    expect(routeRoles('tenants')).toEqual(['superadmin']);
  });

  it('keeps management modules for superadmin and admin', () => {
    expect(routeRoles('users')).toEqual(['superadmin', 'admin']);
    expect(routeRoles('units')).toEqual(['superadmin', 'admin']);
    expect(routeRoles('residents')).toEqual(['superadmin', 'admin']);
    expect(routeRoles('charges')).toEqual(['superadmin', 'admin']);
    expect(routeRoles('amenities')).toEqual(['superadmin', 'admin']);
  });

  it('keeps payments, maintenance and reservations open to end users', () => {
    expect(routeRoles('payments')).toEqual(['superadmin', 'admin', 'residente', 'familiar']);
    expect(routeRoles('maintenance')).toEqual(['superadmin', 'admin', 'residente', 'familiar']);
    expect(routeRoles('reservations')).toEqual(['superadmin', 'admin', 'residente', 'familiar']);
  });
});
