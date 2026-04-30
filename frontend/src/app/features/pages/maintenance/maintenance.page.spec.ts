import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { MaintenancePage } from './maintenance.page';

describe('MaintenancePage config by role', () => {
  const authMock = {
    role: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const build = (role: string) => {
    authMock.role.mockReturnValue(role);
    return TestBed.configureTestingModule({
      imports: [MaintenancePage],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).createComponent(MaintenancePage).componentInstance;
  };

  it('allows edit/delete for superadmin', () => {
    const component = build('superadmin');

    expect(component.config.allowEdit).toBe(true);
    expect(component.config.allowDelete).toBe(true);
    expect(component.config.fields.map((f) => f.key)).toContain('tenantId');
  });

  it('allows edit/delete for admin', () => {
    const component = build('admin');

    expect(component.config.allowEdit).toBe(true);
    expect(component.config.allowDelete).toBe(true);
  });

  it('blocks edit/delete for resident users', () => {
    const component = build('residente');

    expect(component.config.allowEdit).toBe(false);
    expect(component.config.allowDelete).toBe(false);
    expect(component.config.fields.map((f) => f.key)).toEqual(['description']);
  });
});
