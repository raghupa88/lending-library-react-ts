import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupBooksApiMock } from '../helpers/api-mocks';
import {
  NAVBAR_BRAND,
  NAVBAR_NAV,
  THEME_TOGGLE,
  USER_GREETING,
  AUTH_BUTTONS,
} from '../helpers/selectors';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
});

test('navbar brand link is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(NAVBAR_BRAND)).toBeVisible();
  await expect(page.locator(NAVBAR_BRAND)).toContainText('Library');
});

test('Home and Books nav links are always visible when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(`${NAVBAR_NAV} a[href="/"]`)).toBeVisible();
  await expect(page.locator(`${NAVBAR_NAV} a[href="/books"]`)).toBeVisible();
});

test('Dashboard nav link is hidden when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(`${NAVBAR_NAV} a[href="/dashboard"]`)).not.toBeVisible();
});

test('Login button is visible in navbar when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(AUTH_BUTTONS).getByRole('button', { name: 'Login' })).toBeVisible();
});

test('active class is applied to Books link on /books', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator(`${NAVBAR_NAV} a[href="/books"]`)).toHaveClass(/active/);
});

test('active class is applied to Home link on /', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(`${NAVBAR_NAV} a[href="/"]`)).toHaveClass(/active/);
});

test('brand link navigates to home from /books', async ({ page }) => {
  await page.goto('/books');
  await page.locator(NAVBAR_BRAND).click();
  await expect(page).toHaveURL('/');
});

test('theme toggle button is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(THEME_TOGGLE)).toBeVisible();
});

test('theme toggle switches body data-theme to dark', async ({ page }) => {
  await page.goto('/');
  // Wait for ThemeContext useEffect to set initial data-theme
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.locator(THEME_TOGGLE).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
});

test('theme toggle cycles back to light on second click', async ({ page }) => {
  await page.goto('/');
  await page.locator(THEME_TOGGLE).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await page.locator(THEME_TOGGLE).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
});

authTest('Dashboard nav link is visible when authenticated', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await authExpect(page.locator(`${NAVBAR_NAV} a[href="/dashboard"]`)).toBeVisible();
});

authTest('user greeting is visible when authenticated', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await authExpect(page.locator(USER_GREETING)).toBeVisible();
  await authExpect(page.locator(USER_GREETING)).toContainText('Hi,');
});
