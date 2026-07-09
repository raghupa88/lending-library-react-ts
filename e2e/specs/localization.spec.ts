import { test, expect } from '@playwright/test';
import { setupBooksApiMock } from '../helpers/api-mocks';
import { expectNoA11yViolations } from '../helpers/axe';

test('language toggle switches nav, home and footer text to Tamil and back', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /your neighbourhood library/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Browse' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gift a subscription' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch language' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'ta');
  await expect(page.getByRole('heading', { level: 1, name: /உங்கள் அருகிலுள்ள நூலகம்/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'முதன்மை' }).getByRole('link', { name: 'உலாவு' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'சந்தாவை பரிசாக அளியுங்கள்' })).toBeVisible();

  await page.getByRole('button', { name: 'மொழியை மாற்று' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1, name: /your neighbourhood library/i })).toBeVisible();
});

test('language preference persists across reloads', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
  await expect(page.getByRole('heading', { level: 1, name: /உங்கள் அருகிலுள்ள நூலகம்/ })).toBeVisible();
});

test('Tamil mode renders body text with the Tamil-script font', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language' }).click();

  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont).toContain('Noto Sans Tamil');
});

test('login and register pages render in Tamil', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language' }).click();

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'மீண்டும் வருக' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'உள்நுழை' })).toBeVisible();

  await page.goto('/register');
  await expect(page.getByRole('heading', { level: 1, name: 'சுவடி நூலகத்தில் சேரவும்' })).toBeVisible();
  await expect(page.getByLabel('முழுப் பெயர்')).toBeVisible();
});

test('home page has no WCAG A/AA violations in Tamil', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
