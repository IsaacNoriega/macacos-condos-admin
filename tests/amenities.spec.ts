import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[formControlName="email"]', 'admin@admin.com');
  await page.fill('input[formControlName="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

async function selectFancy(page: Page, fieldLabel: string, optionSubstring: string) {
  const field = page.locator('.mcs-field', { hasText: fieldLabel });
  await field.locator('button.fancy-trigger').click();
  const menu = page.locator('.fancy-menu');
  await expect(menu).toBeVisible();
  const option = menu.locator('button.fancy-option').filter({ hasText: optionSubstring }).first();
  await option.click();
  await expect(menu).not.toBeVisible();
}

test.describe('Amenities Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/amenities');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new amenity', async ({ page }) => {
    const randomName = `Gym ${Math.floor(Math.random() * 10000)}`;
    await page.click('button:has-text("Nueva amenidad")');
    
    await page.fill('input[formControlName="name"]', randomName);
    await page.fill('textarea[formControlName="description"]', 'A test gym created via E2E.');
    await page.fill('input[formControlName="maxDurationHours"]', '2');
    
    if (await page.locator('app-fancy-select[formControlName="tenantId"]').isVisible()) {
      await selectFancy(page, 'Tenant *', 'E2E Test Tenant');
    }
    
    await page.click('button:has-text("Crear amenidad")');
    
    const toast = page.locator('.mcs-toast').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/Amenidad creada/);
    
    const searchBox = page.getByPlaceholder('Buscar amenidad...');
    await searchBox.fill(randomName);
    await page.waitForTimeout(500);
    
    const newCard = page.locator('.amenity-card').filter({ hasText: randomName }).first();
    await expect(newCard).toBeVisible({ timeout: 7000 });
  });
});
