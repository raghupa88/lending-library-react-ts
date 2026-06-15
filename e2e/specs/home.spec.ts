import { test, expect } from '@playwright/test';
import { setupBooksApiMock } from '../helpers/api-mocks';
import {
  HERO_TITLE,
  CTA_TITLE,
  FEATURED_BOOKS_GRID,
  BOOK_CARD,
} from '../helpers/selectors';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
});

test('hero title renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(HERO_TITLE)).toHaveText('Your Digital Reading Partner');
});

test('"Get Started" button is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Get Started' }).first()).toBeVisible();
});

test('"Get Started" navigates to /register when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).first().click();
  await expect(page).toHaveURL('/register');
});

test('features section shows Home Delivery and Vast Collection', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Home Delivery')).toBeVisible();
  await expect(page.getByText('Vast Collection')).toBeVisible();
});

test('featured books grid shows book cards from API', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(`${FEATURED_BOOKS_GRID} ${BOOK_CARD}`).first()).toBeVisible();
  await expect(page.locator(`${FEATURED_BOOKS_GRID} ${BOOK_CARD}`)).toHaveCount(3);
});

test('"View All Books" navigates to /books', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'View All Books' }).click();
  await expect(page).toHaveURL('/books');
});

test('CTA section renders "Ready to Start Reading?"', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(CTA_TITLE)).toHaveText('Ready to Start Reading?');
});
