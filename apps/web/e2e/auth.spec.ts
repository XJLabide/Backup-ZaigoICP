/**
 * E2E tests for authentication flows
 *
 * Tests Clerk-based authentication:
 * - Sign-in page loads correctly
 * - Unauthenticated users are redirected to sign-in
 * - Protected routes require authentication
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Sign-in page', () => {
    test('loads the sign-in page', async ({ page }) => {
      await page.goto('/sign-in');

      // Clerk sign-in component should be present
      // Wait for either the Clerk component or error state
      const response = await page.waitForResponse(
        (response) =>
          response.url().includes('clerk') || response.url().includes('sign-in'),
        { timeout: 10000 }
      ).catch(() => null);

      // Page should have sign-in related content
      await expect(page).toHaveURL(/sign-in/);
    });

    test('has accessible sign-in elements', async ({ page }) => {
      await page.goto('/sign-in');

      // Wait for the page to load
      await page.waitForLoadState('networkidle');

      // Check for common Clerk elements
      // These may vary based on Clerk configuration
      const hasEmailInput = await page.locator('input[type="email"], input[name="identifier"]').count();
      const hasSubmitButton = await page.locator('button[type="submit"]').count();

      // At least one authentication method should be present
      expect(hasEmailInput > 0 || hasSubmitButton > 0).toBeTruthy();
    });
  });

  test.describe('Protected routes', () => {
    test('redirects unauthenticated users from dashboard', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies();

      await page.goto('/dashboard');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('redirects unauthenticated users from onboarding', async ({ page }) => {
      await page.context().clearCookies();

      await page.goto('/onboarding');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('redirects unauthenticated users from settings', async ({ page }) => {
      await page.context().clearCookies();

      await page.goto('/settings');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('API protection', () => {
    test('returns 401 for unauthenticated /api/me request', async ({ request }) => {
      const response = await request.get('/api/me');

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('returns 401 for unauthenticated /api/user/status request', async ({ request }) => {
      const response = await request.get('/api/user/status');

      expect(response.status()).toBe(401);
    });

    test('health check is public', async ({ request }) => {
      const response = await request.get('/api/health');

      // Health check should be accessible without auth
      // May return 200 (connected) or 503 (disconnected)
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data.status).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });
});

test.describe('Authentication with credentials', () => {
  // These tests require E2E auth credentials to be configured
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    'Skipping authenticated tests - no credentials provided'
  );

  test.use({ storageState: '.playwright/auth.json' });

  test('authenticated user can access dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Should stay on dashboard, not redirect
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('authenticated user can access onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    // Should stay on onboarding or redirect to dashboard if already connected
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('authenticated /api/me returns user data', async ({ request }) => {
    const response = await request.get('/api/me');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.user).toBeDefined();
  });
});
