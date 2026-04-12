import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TenantsPage } from './tenants.page';

describe('TenantsPage config', () => {
  it('exposes tenants CRUD config', () => {
    const fixture = TestBed.configureTestingModule({ imports: [TenantsPage] }).createComponent(TenantsPage);
    const component = fixture.componentInstance;

    expect(component.config.endpoint).toBe('/tenants');
    expect(component.config.listKey).toBe('tenants');
    expect(component.config.fields.map((field) => field.key)).toEqual(['name', 'address', 'contactEmail']);
  });
});
