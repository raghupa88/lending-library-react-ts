import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupBookDetailApiMock } from '../helpers/api-mocks';
import { MOCK_BOOK_ITEMS } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupAllApiMocks(page);
});

test('renders title, author, meta chips and availability', async ({ page }) => {
  await page.goto('/books/book-1');
  await expect(
    page.getByRole('heading', { level: 1, name: 'The Great Gatsby' }),
  ).toBeVisible();
  await expect(page.getByText('by F. Scott Fitzgerald')).toBeVisible();
  await expect(page.getByText('Fiction', { exact: true })).toBeVisible();
  await expect(page.getByText('180 pages')).toBeVisible();
  await expect(page.getByText('2 of 3 copies on shelf')).toBeVisible();
});

test('back link returns to the catalog', async ({ page }) => {
  await page.goto('/books/book-1');
  await page.getByRole('link', { name: /back to the shelf/i }).click();
  await expect(page).toHaveURL('/books');
});

test('borrow while signed out redirects to login with returnTo', async ({ page }) => {
  await page.goto('/books/book-1');
  await page.getByRole('button', { name: /borrow this book/i }).click();
  await expect(page).toHaveURL('/login?returnTo=%2Fbooks%2Fbook-1');
});

test('unavailable book disables the borrow button', async ({ page }) => {
  await setupBookDetailApiMock(page, { success: true, data: MOCK_BOOK_ITEMS[1] });
  await page.goto('/books/book-2');
  await expect(page.getByRole('button', { name: /currently unavailable/i })).toBeDisabled();
  await expect(page.getByText('Currently borrowed out')).toBeVisible();
});

test('unknown book shows the not-found state', async ({ page }) => {
  await setupBookDetailApiMock(page, { success: false, error: 'Book not found' });
  await page.goto('/books/nope');
  await expect(page.getByRole('heading', { name: 'Book not found' })).toBeVisible();
});

authTest('borrow while signed in shows the coming-soon toast', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/books/book-1');
  await page.getByRole('button', { name: /borrow this book/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/member release/i),
  ).toBeVisible();
});

test('book detail has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/books/book-1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
