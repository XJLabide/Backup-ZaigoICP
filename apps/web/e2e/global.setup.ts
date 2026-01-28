/**
 * Playwright global setup
 *
 * Handles test user authentication and environment verification.
 * Saves authentication state for reuse across tests.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  // Verify required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing env vars for E2E: ${missingVars.join(', ')}`);
    console.warn('Some tests may be skipped.');
  }

  // For CI, we may need to authenticate a test user
  // This is a placeholder for Clerk authentication setup
  if (process.env.E2E_CLERK_USER_EMAIL && process.env.E2E_CLERK_USER_PASSWORD) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Navigate to sign-in page
      await page.goto(`${baseURL}/sign-in`);

      // Wait for Clerk's sign-in form to load
      await page.waitForSelector('[data-testid="sign-in-email-address-field"]', {
        timeout: 10000,
      }).catch(() => {
        // Clerk may use different selectors
        console.log('Default Clerk selector not found, trying alternatives...');
      });

      // Fill in email
      const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
      await emailInput.fill(process.env.E2E_CLERK_USER_EMAIL);

      // Submit email
      await page.click('button[type="submit"]');

      // Wait for password field
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });

      // Fill in password
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD);

      // Submit password
      await page.click('button[type="submit"]');

      // Wait for navigation to complete
      await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
        console.log('Did not navigate to dashboard, may need onboarding');
      });

      // Save authentication state
      await page.context().storageState({ path: '.playwright/auth.json' });
      console.log('Authentication state saved.');
    } catch (error) {
      console.warn('Authentication setup failed:', error);
      console.warn('Tests requiring authentication may fail.');
    } finally {
      await browser.close();
    }
  } else {
    console.log('E2E auth credentials not provided. Skipping auth setup.');
    console.log('Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD for authenticated tests.');
  }
}

export default globalSetup;
