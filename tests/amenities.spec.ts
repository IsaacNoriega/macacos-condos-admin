import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[formControlName="email"]', 'admin@admin.com');
  await page.fill('input[formControlName="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Amenities Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/amenities');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new amenity', async ({ page }) => {
    await page.click('button:has-text("Nueva amenidad")');
    
    await page.fill('input[formControlName="name"]', 'Gym E2E Test');
    await page.fill('textarea[formControlName="description"]', 'A test gym created via E2E.');
    await page.fill('input[formControlName="maxDurationHours"]', '2');
    
    const tenantSelect = page.locator('select[formControlName="tenantId"]');
    if (await tenantSelect.isVisible()) {
      await expect(tenantSelect.locator('option').nth(1)).toBeAttached();
      await tenantSelect.selectOption({ label: 'E2E Test Tenant' });
    }
    
    await page.click('button:has-text("Crear amenidad")');
    
    const toast = page.locator('.mcs-toast').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/Amenidad creada/);
    
    await expect(page.locator('.amenity-card').filter({ hasText: 'Gym E2E Test' }).first()).toBeVisible();
  });
});
