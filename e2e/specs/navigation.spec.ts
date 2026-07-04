import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupBooksApiMock } from '../helpers/api-mocks';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
});

test('navbar wordmark is visible and links home', async ({ page }) => {
  await page.goto('/books');
  const brand = page.getByRole('link', { name: /suvadi — home/i });
  await expect(brand).toBeVisible();
  await brand.click();
  await expect(page).toHaveURL('/');
});

test('Browse link is visible when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Browse' }),
  ).toBeVisible();
});

test('Dashboard link is hidden when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Dashboard' }),
  ).toHaveCount(0);
});

test('Sign in and Join now are visible when unauthenticated', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Join now' })).toBeVisible();
});

test('skip link jumps to main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: /skip to content/i });
  await expect(skipLink).toBeFocused();
  await skipLink.press('Enter');
  await expect(page).toHaveURL('/#main');
});

test('theme toggle switches html data-theme to dark and back', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /switch to light theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('theme preference persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('mobile menu opens as a sheet with nav links', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const sheet = page.getByRole('dialog', { name: 'Menu' });
  await expect(sheet.getByRole('link', { name: 'Browse' })).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('footer renders explore links', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('navigation', { name: 'Footer' });
  await expect(footer.getByRole('link', { name: 'Browse books' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Become a member' })).toBeVisible();
});

authTest('Dashboard link is visible when authenticated', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await authExpect(
    page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
});

authTest('avatar and logout are visible when authenticated', async ({
  authenticatedPage: page,
}) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await authExpect(nav.getByRole('link', { name: /dashboard for test member/i })).toBeVisible();
  await authExpect(nav.getByRole('button', { name: 'Logout' })).toBeVisible();
});

// Un-skip when the catalog page is redesigned: the legacy Books page ships its
// own colors that fail contrast on the new token background.
test.fixme('books catalog page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/books');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expectNoA11yViolations(page);
});
