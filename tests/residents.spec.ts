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
  await expect(option).toBeVisible({ timeout: 5000 });
  
  await option.click();
  await expect(menu).not.toBeVisible();
}

test.describe('Resident Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/residents');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new resident', async ({ page }) => {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const randomName = `Test Resident ${randomSuffix}`;
    
    await page.click('button:has-text("Nuevo residente")');
    
    await selectFancy(page, 'Tenant', 'E2E Test Tenant');
    await page.waitForTimeout(1500);
    
    await selectFancy(page, 'Unidad', 'E2E-999');
    await selectFancy(page, 'Usuario', 'resident@test.com');
    
    await page.fill('input[formControlName="name"]', randomName);
    await page.fill('input[formControlName="phone"]', '1234567890');
    await selectFancy(page, 'Relación', 'Propietario');
    
    // Fix: Using getByRole().last() to target the button in the drawer/dialog
    const submitBtn = page.getByRole('button', { name: 'Crear residente' }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    
    const toast = page.locator('.mcs-toast').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/Residente creado/);
    
    const searchBox = page.getByPlaceholder('Buscar por nombre, correo o unidad...');
    await searchBox.fill(randomName);
    await page.waitForTimeout(500);
    
    const newCard = page.locator('.mcs-card').filter({ hasText: randomName }).first();
    await expect(newCard).toBeVisible({ timeout: 10000 });
  });

  test('should respect tenant isolation for residents', async ({ page }) => {
    const tenantFilter = page.locator('header select.mcs-input');
    await expect(tenantFilter).toBeVisible();
    await tenantFilter.selectOption({ label: 'E2E Test Tenant' });
    await expect(page.locator('.mcs-page-sub')).toContainText('totales');
  });
});
