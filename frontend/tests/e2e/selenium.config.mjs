/**
 * Selenium WebDriver Configuration
 * Cấu hình cho Selenium E2E Tests
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

// URLs
export const BASE_URL = 'http://localhost:3000';
export const API_URL = 'http://localhost:5000';

// Timeouts (ms)
export const TIMEOUTS = {
  implicit: 10000,
  pageLoad: 30000,
  script: 30000,
  element: 5000,
};

// Test User Data
export const TEST_USER = {
  name: 'Selenium Test User',
  email: `selenium_test_${Date.now()}@test.com`,
  password: 'Test@123456',
};

// Test Product
export const TEST_PRODUCT = {
  name: 'Test Product',
  slug: 'test-product',
};

// Shipping Address
export const SHIPPING_ADDRESS = {
  fullName: 'Nguyen Van Test',
  address: '123 Test Street',
  city: 'Ho Chi Minh',
  postalCode: '70000',
  country: 'Vietnam',
};

/**
 * Create WebDriver instance
 * @param {boolean} headless - Run in headless mode
 * @returns {WebDriver}
 */
export async function createDriver(headless = false) {
  const options = new chrome.Options();
  
  // Headless mode
  if (headless || process.env.HEADLESS === 'true') {
    options.addArguments('--headless');
  }
  
  // Common options
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-extensions');
  options.addArguments('--disable-infobars');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  // Set timeouts
  await driver.manage().setTimeouts({
    implicit: TIMEOUTS.implicit,
    pageLoad: TIMEOUTS.pageLoad,
    script: TIMEOUTS.script,
  });
  
  return driver;
}

export default {
  BASE_URL,
  API_URL,
  TIMEOUTS,
  TEST_USER,
  TEST_PRODUCT,
  SHIPPING_ADDRESS,
  createDriver,
};
