import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupBooksApiMock, setupLogoutApiMock } from '../helpers/api-mocks';
import {
  DASHBOARD_TITLE,
  STAT_CARD,
  PROFILE_INFO,
  SECTION_TITLE,
} from '../helpers/selectors';

test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

authTest('dashboard title renders for authenticated user', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await authExpect(page.locator(DASHBOARD_TITLE)).toHaveText('My Dashboard');
});

authTest('four stat cards are rendered', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await authExpect(page.locator(STAT_CARD)).toHaveCount(4);
});

authTest('plan stat shows user plan', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  // The Plan stat card contains the user's plan value ("basic")
  await authExpect(page.locator(STAT_CARD).filter({ hasText: 'Plan' })).toContainText('basic');
});

authTest('"Currently Borrowed" section heading is visible', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await authExpect(page.locator(SECTION_TITLE).filter({ hasText: 'Currently Borrowed' })).toBeVisible();
});

authTest('profile information section shows user name and email', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  const profile = page.locator(PROFILE_INFO);
  await authExpect(profile).toContainText('Test Member');
  await authExpect(profile).toContainText('member@example.com');
});

authTest('logout on dashboard clears session and redirects to login', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await setupLogoutApiMock(page);
  await page.goto('/dashboard');
  await authExpect(page.locator(DASHBOARD_TITLE)).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).first().click();
  await authExpect(page).toHaveURL('/login');
});
