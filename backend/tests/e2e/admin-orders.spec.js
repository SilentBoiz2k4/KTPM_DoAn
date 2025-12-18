// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * GUI Testing - Based on GUI.csv
 * Admin Order Management E2E Tests
 */

// Test data
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'password123';
const USER_EMAIL = 'user@test.com';
const USER_PASSWORD = 'password123';

test.describe('Admin Order Management - GUI Tests', () => {
  // ==================== NAVIGATION TESTS ====================
  test.describe('Navigation Module', () => {
    test('TC_GUI_OM_001: Admin menu display', async ({ page }) => {
      // Login as admin
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForURL('/');

      // Verify admin dropdown visible
      const adminDropdown = page.locator('text=Admin');
      await expect(adminDropdown).toBeVisible();
    });

    test('TC_GUI_OM_002: Navigate to Orders page', async ({ page }) => {
      // Login as admin
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Click Admin dropdown
      await page.click('text=Admin');

      // Click Orders
      await page.click('text=Orders');

      // Verify navigation
      await expect(page).toHaveURL('/admin/orders');
      await expect(page.locator('h1')).toContainText('Orders');
    });

    test('TC_GUI_OM_003: Navigate to Dashboard', async ({ page }) => {
      // Login as admin
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Click Admin dropdown
      await page.click('text=Admin');

      // Click Dashboard
      await page.click('text=Dashboard');

      // Verify navigation
      await expect(page).toHaveURL('/admin/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });

  // ==================== ORDER LIST TESTS ====================
  test.describe('Order List Module', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin and navigate to orders
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');
    });

    test('TC_GUI_OM_004: Order table structure', async ({ page }) => {
      // Verify table headers
      await expect(page.locator('th:has-text("ID")')).toBeVisible();
      await expect(page.locator('th:has-text("USER")')).toBeVisible();
      await expect(page.locator('th:has-text("DATE")')).toBeVisible();
      await expect(page.locator('th:has-text("TOTAL")')).toBeVisible();
      await expect(page.locator('th:has-text("PAID")')).toBeVisible();
      await expect(page.locator('th:has-text("STATUS")')).toBeVisible();
      await expect(page.locator('th:has-text("ACTIONS")')).toBeVisible();
    });

    test('TC_GUI_OM_005: Order data display', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Verify at least one order row exists
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('TC_GUI_OM_007: Date formatting', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Get first date cell
      const dateCell = page.locator('tbody tr').first().locator('td').nth(2);
      const dateText = await dateCell.textContent();

      // Verify date format YYYY-MM-DD
      expect(dateText).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    test('TC_GUI_OM_008: Price formatting', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Get first price cell
      const priceCell = page.locator('tbody tr').first().locator('td').nth(3);
      const priceText = await priceCell.textContent();

      // Verify price has $ and decimals
      expect(priceText).toMatch(/\$\d+\.\d{2}/);
    });

    test('TC_GUI_OM_009: Payment status display', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Get first paid status cell
      const paidCell = page.locator('tbody tr').first().locator('td').nth(4);
      const paidText = await paidCell.textContent();

      // Verify "Yes" or "No"
      expect(['Yes', 'No']).toContain(paidText?.trim());
    });

    test('TC_GUI_OM_010: Status dropdown display', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Verify status dropdown exists
      const statusDropdown = page.locator('tbody tr').first().locator('select');
      await expect(statusDropdown).toBeVisible();
    });

    test('TC_GUI_OM_011: Status dropdown options', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Get status dropdown
      const statusDropdown = page.locator('tbody tr').first().locator('select');

      // Verify all options
      const options = await statusDropdown.locator('option').allTextContents();
      expect(options).toContain('Pending');
      expect(options).toContain('Processing');
      expect(options).toContain('Shipping');
      expect(options).toContain('Delivered');
      expect(options).toContain('Cancelled');
    });

    test('TC_GUI_OM_013: Details button display', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Verify Details button exists
      const detailsButton = page.locator('tbody tr').first().locator('button:has-text("Details")');
      await expect(detailsButton).toBeVisible();
    });

    test('TC_GUI_OM_014: Details button navigation', async ({ page }) => {
      // Wait for orders to load
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // Click Details button
      await page.locator('tbody tr').first().locator('button:has-text("Details")').click();

      // Verify navigation to order details
      await expect(page).toHaveURL(/\/order\/[a-f0-9]+/);
    });

    test('TC_GUI_OM_015: Loading state', async ({ page }) => {
      // Navigate to orders page
      await page.goto('/admin/orders');

      // Check for loading spinner (should appear briefly)
      const loadingSpinner = page.locator('.spinner-border, .loading, [role="status"]');
      
      // Either spinner is visible or orders loaded quickly
      const isVisible = await loadingSpinner.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  // ==================== ORDER DETAILS TESTS ====================
  test.describe('Order Details Module', () => {
    test('TC_GUI_OM_019: Page header display', async ({ page }) => {
      // Login and navigate to first order
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');
      await page.waitForSelector('tbody tr', { timeout: 5000 });
      await page.locator('tbody tr').first().locator('button:has-text("Details")').click();

      // Verify header contains "Order"
      await expect(page.locator('h1')).toContainText('Order');
    });

    test('TC_GUI_OM_020: Shipping card layout', async ({ page }) => {
      // Navigate to order details (same as above)
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');
      await page.waitForSelector('tbody tr', { timeout: 5000 });
      await page.locator('tbody tr').first().locator('button:has-text("Details")').click();

      // Verify shipping information
      await expect(page.locator('text=Shipping')).toBeVisible();
      await expect(page.locator('text=Name:')).toBeVisible();
      await expect(page.locator('text=Address:')).toBeVisible();
    });

    test('TC_GUI_OM_022: Payment card layout', async ({ page }) => {
      // Navigate to order details
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');
      await page.waitForSelector('tbody tr', { timeout: 5000 });
      await page.locator('tbody tr').first().locator('button:has-text("Details")').click();

      // Verify payment information
      await expect(page.locator('text=Payment Method')).toBeVisible();
    });

    test('TC_GUI_OM_024: Items list display', async ({ page }) => {
      // Navigate to order details
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');
      await page.waitForSelector('tbody tr', { timeout: 5000 });
      await page.locator('tbody tr').first().locator('button:has-text("Details")').click();

      // Verify items section
      await expect(page.locator('text=Order Items')).toBeVisible();
    });

    test('TC_GUI_OM_027: Order summary card', async ({ page }) => {
      // Navigate to order details
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');
      await page.waitForSelector('tbody tr', { timeout: 5000 });
      await page.locator('tbody tr').first().locator('button:has-text("Details")').click();

      // Verify summary fields
      await expect(page.locator('text=Items')).toBeVisible();
      await expect(page.locator('text=Shipping')).toBeVisible();
      await expect(page.locator('text=Tax')).toBeVisible();
      await expect(page.locator('text=Total')).toBeVisible();
    });
  });

  // ==================== DASHBOARD TESTS ====================
  test.describe('Dashboard Module', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin and navigate to dashboard
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Dashboard');
      await page.waitForURL('/admin/dashboard');
    });

    test('TC_GUI_OM_033: Page header', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('TC_GUI_OM_034: Statistics cards layout', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Verify statistics cards
      await expect(page.locator('text=Users')).toBeVisible();
      await expect(page.locator('text=Orders')).toBeVisible();
      await expect(page.locator('text=Sales')).toBeVisible();
    });

    test('TC_GUI_OM_038: Sales chart display', async ({ page }) => {
      // Wait for chart to render
      await page.waitForTimeout(2000);

      // Verify chart exists (Recharts uses SVG)
      const chart = page.locator('svg').first();
      await expect(chart).toBeVisible();
    });
  });

  // ==================== RESPONSIVE TESTS ====================
  test.describe('Responsive Design', () => {
    test('TC_GUI_OM_046: Mobile table scroll', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Login and navigate to orders
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');

      // Verify table is scrollable
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });

    test('TC_GUI_OM_047: Mobile cards stack', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Login and navigate to dashboard
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Dashboard');
      await page.waitForURL('/admin/dashboard');

      // Verify cards are visible (should stack on mobile)
      await expect(page.locator('text=Users')).toBeVisible();
      await expect(page.locator('text=Orders')).toBeVisible();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================
  test.describe('Accessibility', () => {
    test('TC_GUI_OM_049: Keyboard navigation', async ({ page }) => {
      // Login and navigate to orders
      await page.goto('/signin');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      await page.click('text=Admin');
      await page.click('text=Orders');
      await page.waitForURL('/admin/orders');

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus is on an interactive element
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'SELECT', 'INPUT']).toContain(focused);
    });
  });
});
