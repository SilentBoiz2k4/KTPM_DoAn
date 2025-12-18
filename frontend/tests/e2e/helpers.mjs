/**
 * Selenium Helper Functions
 * Các hàm tiện ích cho Selenium E2E Tests
 */

import { By, until } from 'selenium-webdriver';
import { BASE_URL, TIMEOUTS } from './selenium.config.mjs';

// Test results tracking
export const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Log test result
 */
export function logTest(name, passed, error = null) {
  const status = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`${status}: ${name}`);
  
  if (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  testResults.tests.push({ name, passed, error: error?.message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

/**
 * Print test summary
 */
export function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log('='.repeat(50));
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }
}
