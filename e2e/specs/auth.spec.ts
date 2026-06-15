import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupLoginApiMock,
  setupBooksApiMock,
  setupLogoutApiMock,
  setupRegisterApiMock,
} from '../helpers/api-mocks';
import { MOCK_LOGIN_FAILURE, MOCK_REGISTER_FAILURE } from '../fixtures/mock-data';
import {
  LOGIN_TITLE,
  LOGIN_ERROR,
  LOGIN_DEMO,
  LOGIN_LINK,
  USER_GREETING,
} from '../helpers/selectors';

// --- Login ---

test('login page renders form and title', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await expect(page.locator(LOGIN_TITLE)).toHaveText('Welcome Back');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('demo credentials are displayed on login page', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await expect(page.locator(LOGIN_DEMO)).toContainText('member@example.com');
});

test('successful login redirects to dashboard', async ({ page }) => {
  await setupAllApiMocks(page);
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('member@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('invalid credentials show error message', async ({ page }) => {
  await setupBooksApiMock(page);
  await setupLoginApiMock(page, MOCK_LOGIN_FAILURE);
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('wrong@example.com');
  await page.locator('input[type="password"]').fill('wrongpass');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator(LOGIN_ERROR)).toBeVisible();
  await expect(page.locator(LOGIN_ERROR)).toContainText('Invalid credentials');
});

test('"Sign up" link navigates to /register', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await page.locator(LOGIN_LINK).click();
  await expect(page).toHaveURL('/register');
});

test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

// --- Register ---

test('register page renders form and title', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register');
  await expect(page.locator(LOGIN_TITLE)).toHaveText('Create Account');
  await expect(page.locator('input[type="text"]')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('successful registration redirects to dashboard', async ({ page }) => {
  await setupAllApiMocks(page);
  await page.goto('/register');
  await page.locator('input[type="text"]').fill('New User');
  await page.locator('input[type="email"]').fill('newuser@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('registration failure shows error message', async ({ page }) => {
  await setupBooksApiMock(page);
  await setupRegisterApiMock(page, MOCK_REGISTER_FAILURE);
  await page.goto('/register');
  await page.locator('input[type="text"]').fill('Test User');
  await page.locator('input[type="email"]').fill('existing@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.locator(LOGIN_ERROR)).toBeVisible();
  await expect(page.locator(LOGIN_ERROR)).toContainText('Email already exists');
});

// --- Logout ---

authTest('logout clears session and redirects to home', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await setupLogoutApiMock(page);
  await page.goto('/');
  await authExpect(page.locator(USER_GREETING)).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).first().click();
  await authExpect(page).toHaveURL('/');
  await authExpect(page.locator(USER_GREETING)).not.toBeVisible();
  await authExpect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});
