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
import { expectNoA11yViolations } from '../helpers/axe';

// --- Login ---

test('login page renders form, demo credentials and title', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByText('Demo credentials')).toBeVisible();
  await expect(page.getByText('member@example.com / password123')).toBeVisible();
});

test('successful login redirects to dashboard', async ({ page }) => {
  await setupAllApiMocks(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('login honours returnTo after success', async ({ page }) => {
  await setupAllApiMocks(page);
  await page.goto('/login?returnTo=%2Fbooks%2Fbook-1');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/books/book-1');
});

test('invalid credentials show a server error alert', async ({ page }) => {
  await setupBooksApiMock(page);
  await setupLoginApiMock(page, MOCK_LOGIN_FAILURE);
  await page.goto('/login');
  await page.getByLabel('Email').fill('wrong@example.com');
  await page.getByLabel('Password').fill('wrongpass');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
});

test('client-side validation flags a bad email before submit', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('whatever1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a valid email address');
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/auth/login')) requests.push(req.url());
  });
  expect(requests).toHaveLength(0);
});

test('"Join now" link navigates to /register', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await page.getByRole('main').getByRole('link', { name: 'Join now' }).click();
  await expect(page).toHaveURL('/register');
});

test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

test('login page has no WCAG A/AA violations', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

// --- Register ---

test('register page renders all fields', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Join Suvadi Library' }),
  ).toBeVisible();
  for (const label of ['Full name', 'Email', 'Phone', 'Delivery address', 'Confirm password']) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('successful registration (with optional fields) redirects to dashboard', async ({
  page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/register');
  await page.getByLabel('Full name').fill('New User');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Phone').fill('+91 98765 43210');
  await page.getByLabel('Delivery address').fill('12 Beach Road, Chennai 600001');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('mismatched passwords are caught client-side', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register');
  await page.getByLabel('Full name').fill('New User');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password124');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toContainText("Passwords don't match");
});

test('registration failure shows a server error alert', async ({ page }) => {
  await setupBooksApiMock(page);
  await setupRegisterApiMock(page, MOCK_REGISTER_FAILURE);
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Test User');
  await page.getByLabel('Email').fill('existing@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toContainText('Email already exists');
});

test('register page has no WCAG A/AA violations', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

// --- Logout ---

authTest('logout clears session and stays on public page', async ({ authenticatedPage: page }) => {
  await setupBooksApiMock(page);
  await setupLogoutApiMock(page);
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await authExpect(nav.getByRole('button', { name: 'Logout' })).toBeVisible();
  await nav.getByRole('button', { name: 'Logout' }).click();
  await authExpect(page).toHaveURL('/');
  await authExpect(nav.getByRole('button', { name: 'Logout' })).toHaveCount(0);
  await authExpect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
});
