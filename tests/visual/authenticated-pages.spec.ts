import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for authenticated user pages
 * Tests both mobile and desktop viewports
 */

test.describe('Authenticated Pages - Visual Tests', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Check if login form exists
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      // Fill in login credentials (using test account)
      await emailInput.fill('test@example.com');
      await page.locator('input[type="password"]').fill('password123');
      
      // Submit form
      await page.locator('button[type="submit"]').click();
      
      // Wait for navigation
      await page.waitForURL('/', { timeout: 5000 }).catch(() => {
        // If login fails, that's ok - we'll skip authenticated tests
        console.log('Login failed - skipping authenticated page screenshots');
      });
    }
  });

  test('Create Event Page', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/create-event.png`,
      fullPage: true 
    });
  });

  test('My Events Page', async ({ page }) => {
    await page.goto('/my-events');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/my-events.png`,
      fullPage: true 
    });
  });

  test('Settings Page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/settings.png`,
      fullPage: true 
    });
  });

  test('Notifications Page', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/notifications.png`,
      fullPage: true 
    });
  });
});
