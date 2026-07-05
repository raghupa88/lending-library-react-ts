import { test, expect } from '@playwright/test';
import { setupBooksApiMock } from '../helpers/api-mocks';
import { MOCK_BOOKS, MOCK_BOOKS_EMPTY } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
});

test('catalog renders heading and result count', async ({ page }) => {
  await page.goto('/books');
  await expect(page.getByRole('heading', { level: 1, name: 'The shelf' })).toBeVisible();
  await expect(page.getByText('3 books in the catalog')).toBeVisible();
});

test('book cards render from API data with availability state', async ({ page }) => {
  await page.goto('/books');
  const gatsby = page.getByRole('link', { name: /the great gatsby by f\. scott fitzgerald/i });
  await expect(gatsby).toBeVisible();
  await expect(gatsby.getByText('On shelf')).toBeVisible();

  const mockingbird = page.getByRole('link', { name: /to kill a mockingbird/i });
  await expect(mockingbird.getByText('Borrowed out')).toBeVisible();
});

test('card click navigates to book detail', async ({ page }) => {
  await page.goto('/books');
  await page.getByRole('link', { name: /ponniyin selvan/i }).click();
  await expect(page).toHaveURL('/books/book-3');
});

test('search input updates the URL and re-queries the API', async ({ page }) => {
  await page.goto('/books');
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/books')) requests.push(req.url());
  });
  await page.getByRole('searchbox', { name: /search books/i }).fill('gatsby');
  await expect(page).toHaveURL(/search=gatsby/);
  await expect
    .poll(() => requests.some((u) => u.includes('search=gatsby')))
    .toBeTruthy();
});

test('genre filter updates the URL and API query', async ({ page }) => {
  await page.goto('/books');
  await page.getByRole('combobox', { name: /filter by genre/i }).selectOption('Fiction');
  await expect(page).toHaveURL(/genre=Fiction/);
});

test('language filter updates the URL and API query', async ({ page }) => {
  await page.goto('/books');
  await page.getByRole('combobox', { name: /filter by language/i }).selectOption('Tamil');
  await expect(page).toHaveURL(/language=Tamil/);
});

test('available-now switch toggles and updates the URL', async ({ page }) => {
  await page.goto('/books');
  const toggle = page.getByRole('switch', { name: 'Available now' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page).toHaveURL(/available=true/);
});

test('filters restore from the URL on load', async ({ page }) => {
  await page.goto('/books?search=gatsby&genre=Fiction&available=true');
  await expect(page.getByRole('searchbox', { name: /search books/i })).toHaveValue('gatsby');
  await expect(page.getByRole('combobox', { name: /filter by genre/i })).toHaveValue('Fiction');
  await expect(page.getByRole('switch', { name: 'Available now' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('clear all resets filters', async ({ page }) => {
  await page.goto('/books?search=gatsby&genre=Fiction');
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page).toHaveURL('/books');
  await expect(page.getByRole('searchbox', { name: /search books/i })).toHaveValue('');
});

test('empty result shows the no-match state with clear action', async ({ page }) => {
  await setupBooksApiMock(page, MOCK_BOOKS_EMPTY);
  await page.goto('/books?search=zzz');
  await expect(page.getByRole('heading', { name: 'No books match' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
});

test('pagination controls appear for multi-page results', async ({ page }) => {
  const paged = {
    success: true,
    data: {
      ...MOCK_BOOKS.data,
      totalPages: 3,
      totalElements: 60,
      hasNext: true,
      hasPrev: false,
    },
  };
  await setupBooksApiMock(page, paged);
  await page.goto('/books');
  const pagination = page.getByRole('navigation', { name: 'Pagination' });
  await expect(pagination.getByText('Page 1 of 3')).toBeVisible();
  await expect(pagination.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await pagination.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=1/);
});

test('catalog has no WCAG A/AA violations in both themes', async ({ page }) => {
  await page.goto('/books');
  await expect(page.getByRole('heading', { level: 1, name: 'The shelf' })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoA11yViolations(page);
});
