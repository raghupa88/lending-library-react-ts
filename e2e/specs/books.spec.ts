import { test, expect } from '@playwright/test';
import { setupBooksApiMock } from '../helpers/api-mocks';
import { MOCK_BOOKS_EMPTY } from '../fixtures/mock-data';
import {
  BOOKS_TITLE,
  BOOKS_GRID,
  BOOK_CARD,
  RESULTS_COUNT,
  FILTER_SELECT,
  NO_RESULTS,
} from '../helpers/selectors';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
});

test('books page renders catalog title', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator(BOOKS_TITLE)).toHaveText('Book Catalog');
});

test('book cards render from API data', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator(`${BOOKS_GRID} ${BOOK_CARD}`)).toHaveCount(3);
});

test('results count reflects number of books', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator(RESULTS_COUNT)).toContainText('3 books found');
});

test('first book card shows correct title', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator(BOOK_CARD).first()).toContainText('The Great Gatsby');
});

test('search input is visible with correct placeholder', async ({ page }) => {
  await page.goto('/books');
  await expect(page.getByPlaceholder('Search books, authors...')).toBeVisible();
});

test('two filter selects are present (genre and language)', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator(FILTER_SELECT)).toHaveCount(2);
});

test('"Available only" checkbox is visible', async ({ page }) => {
  await page.goto('/books');
  await expect(page.getByText('Available only')).toBeVisible();
});

test('empty state shows "No books found" when API returns empty list', async ({ page }) => {
  // Override the mock for this specific test
  await page.unroute('http://localhost:8080/api/v1/books*');
  await setupBooksApiMock(page, MOCK_BOOKS_EMPTY);
  await page.goto('/books');
  await expect(page.locator(NO_RESULTS)).toBeVisible();
  await expect(page.locator(NO_RESULTS)).toContainText('No books found');
});

test('"Clear" button resets search input', async ({ page }) => {
  await page.goto('/books');
  const searchInput = page.getByPlaceholder('Search books, authors...');
  await searchInput.fill('gatsby');
  await expect(searchInput).toHaveValue('gatsby');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(searchInput).toHaveValue('');
});

test('Apply Filters button is visible', async ({ page }) => {
  await page.goto('/books');
  await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
});
