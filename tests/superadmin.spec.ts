import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[formControlName="email"]', 'admin@admin.com');
  await page.fill('input[formControlName="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Superadmin Capabilities', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should see tenant selector in Residents page', async ({ page }) => {
    await page.goto('/residents');
    await page.waitForLoadState('networkidle');
    const tenantSelector = page.locator('header select.mcs-input');
    await expect(tenantSelector).toBeVisible();
    await expect(tenantSelector.locator('option')).toContainText(['Todos los condominios']);
  });

  test('should aggregate data globally on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.kpi-card').first()).toBeVisible();
    // Fix strict mode: pick first
    await expect(page.getByText(/Resumen del condominio|Buenas noches|Bienvenido/).first()).toBeVisible();
  });
});
