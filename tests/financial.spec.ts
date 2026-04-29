import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[formControlName="email"]', 'admin@admin.com');
  await page.fill('input[formControlName="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Financial Modules', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load charges list', async ({ page }) => {
    await page.goto('/charges');
    await page.waitForLoadState('networkidle');
    const title = page.locator('.mcs-page-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Cargos');
    // Verify that the empty state is NOT showing "Error cargando catálogos" (the bug we fixed)
    await expect(page.locator('text=Error cargando catálogos')).not.toBeVisible();
  });

  test('should load payments list', async ({ page }) => {
    await page.goto('/payments');
    await page.waitForLoadState('networkidle');
    const title = page.locator('.mcs-page-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Pagos');
    await expect(page.locator('text=Error cargando catálogos')).not.toBeVisible();
  });
});
