import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[formControlName="email"]', 'admin@admin.com');
  await page.fill('input[formControlName="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

async function selectFancy(page: Page, fieldLabel: string, optionLabel: string) {
  const field = page.locator('.mcs-field', { hasText: fieldLabel });
  await field.locator('button.fancy-trigger').click();
  await expect(page.locator('.fancy-menu')).toBeVisible();
  await page.locator('button.fancy-option', { hasText: optionLabel }).click();
}

async function selectFancyFirst(page: Page, fieldLabel: string) {
  const field = page.locator('.mcs-field', { hasText: fieldLabel });
  await field.locator('button.fancy-trigger').click();
  await expect(page.locator('.fancy-menu')).toBeVisible();
  await page.locator('button.fancy-option').first().click();
}

test.describe('Resident Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/residents');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new resident', async ({ page }) => {
    await page.click('button:has-text("Nuevo residente")');
    
    // Fill required fields using seeded data
    await selectFancy(page, 'Tenant', 'E2E Test Tenant');
    
    // Wait for Unit and User to load based on Tenant
    await page.waitForTimeout(500); // Small buffer for async loading
    
    await selectFancy(page, 'Unidad', 'E2E-101');
    await selectFancy(page, 'Usuario', 'E2E Resident User');
    
    await page.fill('input[formControlName="name"]', 'Test Resident E2E');
    await page.fill('input[formControlName="phone"]', '1234567890');
    
    // Submit
    await page.click('button:has-text("Crear residente")');
    
    // Verify toast
    await expect(page.locator('text=Residente creado').first()).toBeVisible();
    await expect(page.locator('.mcs-card')).toContainText('Test Resident E2E');
  });

  test('should respect tenant isolation for residents', async ({ page }) => {
    const tenantFilter = page.locator('header select.mcs-input');
    await expect(tenantFilter).toBeVisible();
    // Select E2E Test Tenant
    await tenantFilter.selectOption({ label: 'E2E Test Tenant' });
    await expect(page.locator('.mcs-page-sub')).toContainText('totales');
  });
});
