import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[formControlName="email"]', 'admin@admin.com');
    await page.fill('input[formControlName="password"]', 'admin123');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    // The title can be "Dashboard" or a personalized greeting like "Buenas noches, Super."
    const title = page.locator('.mcs-page-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText(/Dashboard|Buenas noches|Bienvenido/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[formControlName="email"]', 'admin@admin.com');
    await page.fill('input[formControlName="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Open user menu
    await page.click('button.user-chip');
    
    // Click logout
    await page.click('button.dd-item.danger');
    
    // Verify redirection back to login
    await expect(page).toHaveURL(/\/login/);
  });
});
