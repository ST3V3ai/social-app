import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for all public pages
 * Tests both mobile and desktop viewports
 */

test.describe('Public Pages - Visual Tests', () => {
  test('Homepage - Hero and Event Listings', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/homepage.png`,
      fullPage: true 
    });
    
    // Verify key elements are visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Explore Page - Event Discovery', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/explore.png`,
      fullPage: true 
    });
  });

  test('Login Page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/login.png`,
      fullPage: true 
    });
    
    // Verify form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Register Page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/register.png`,
      fullPage: true 
    });
  });

  test('About Page', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/about.png`,
      fullPage: true 
    });
  });

  test('Help Page', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/help.png`,
      fullPage: true 
    });
  });

  test('Terms Page', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/terms.png`,
      fullPage: true 
    });
  });

  test('Privacy Page', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/privacy.png`,
      fullPage: true 
    });
  });
});
