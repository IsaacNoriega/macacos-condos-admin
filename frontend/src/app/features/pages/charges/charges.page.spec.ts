import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { ChargesPage } from './charges.page';

describe('ChargesPage config by role', () => {
  const authMock = {
    role: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes tenant field for superadmin', () => {
    authMock.role.mockReturnValue('superadmin');

    const fixture = TestBed.configureTestingModule({
      imports: [ChargesPage],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).createComponent(ChargesPage);

    const keys = fixture.componentInstance.config.fields.map((field) => field.key);
    expect(keys).toContain('tenantId');
    expect(keys).toContain('userId');
    expect(keys).toContain('amount');
  });

  it('does not include tenant field for admin', () => {
    authMock.role.mockReturnValue('admin');

    const fixture = TestBed.configureTestingModule({
      imports: [ChargesPage],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).createComponent(ChargesPage);

    const keys = fixture.componentInstance.config.fields.map((field) => field.key);
    expect(keys).not.toContain('tenantId');
    expect(keys).toContain('userId');
  });
});
