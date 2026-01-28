import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for responsive components
 * Tests navigation, forms, and interactive elements
 */

test.describe('Responsive Components - Visual Tests', () => {
  test('Navigation - Mobile Menu', async ({ page, browserName }) => {
    // Only test mobile menu on mobile viewport
    if (test.info().project.name.includes('Mobile')) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for mobile menu button
      const menuButton = page.locator('button').filter({ hasText: /menu|nav/i }).first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        // Wait for menu to be visible instead of arbitrary timeout
        await page.locator('nav').waitFor({ state: 'visible' });
        
        await page.screenshot({ 
          path: `screenshots/${test.info().project.name}/mobile-menu-open.png`,
          fullPage: true 
        });
      }
    }
  });

  test('Event Card Grid - Responsive Layout', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    
    // Scroll to see event cards and wait for content to settle
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForLoadState('domcontentloaded');
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/event-cards.png`,
      fullPage: false 
    });
  });

  test('Form Inputs - Mobile vs Desktop', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Focus on form to show input states
    await page.locator('input[type="text"]').first().click();
    
    await page.screenshot({ 
      path: `screenshots/${test.info().project.name}/form-inputs.png`,
      fullPage: true 
    });
  });
});
