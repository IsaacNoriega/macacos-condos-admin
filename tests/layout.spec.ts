import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[formControlName="email"]', 'admin@admin.com');
  await page.fill('input[formControlName="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Layout & Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should toggle sidebar on mobile view', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if sidebar is hidden or trigger is visible
    const menuToggle = page.locator('button.menu-toggle');
    // Ensure it's attached and visible
    await expect(menuToggle).toBeVisible();
    
    // Open menu
    await menuToggle.click();
    
    // Check if sidebar backdrop is visible
    const backdrop = page.locator('.sidebar-backdrop');
    await expect(backdrop).toHaveClass(/visible/);
    
    // Sidebar should be open
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveClass(/open/);
  });
});
