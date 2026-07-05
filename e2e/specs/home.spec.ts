import { test, expect } from '@playwright/test';
import { setupBooksApiMock, setupSubscriptionsApiMock } from '../helpers/api-mocks';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
  await setupSubscriptionsApiMock(page);
});

test('hero headline renders', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: /your neighbourhood library/i }),
  ).toBeVisible();
});

test('"Browse the shelf" navigates to /books', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /browse the shelf/i }).click();
  await expect(page).toHaveURL('/books');
});

test('"View plans" navigates to the plans page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /view plans/i }).click();
  await expect(page).toHaveURL('/plans');
});

test('"New on the shelf" lists books from the API', async ({ page }) => {
  await page.goto('/');
  const shelf = page.getByRole('list').filter({ hasText: 'The Great Gatsby' });
  await expect(shelf.getByRole('link', { name: /great gatsby/i })).toBeVisible();
  await expect(shelf.getByRole('link', { name: /ponniyin selvan/i })).toBeVisible();
});

test('book link navigates to the book detail page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /great gatsby/i }).click();
  await expect(page).toHaveURL('/books/book-1');
});

test('how-it-works section lists the three steps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick a plan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Borrow your books' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Delivered to your door' })).toBeVisible();
});

test('plans teaser shows all four plans with the Standard plan marked popular', async ({
  page,
}) => {
  await page.goto('/');
  const plans = page.locator('#plans');
  for (const name of ['Basic', 'Standard', 'Premium', 'Family']) {
    await expect(plans.getByRole('heading', { name })).toBeVisible();
  }
  await expect(plans.getByText('Popular')).toBeVisible();
});

test('CTA band navigates to /register', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /become a member/i }).click();
  await expect(page).toHaveURL('/register');
});

test('home page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('home page has no WCAG A/AA violations in dark mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoA11yViolations(page);
});
