import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBooksApiMock,
  setupSubscriptionsApiMock,
} from '../helpers/api-mocks';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
  await setupSubscriptionsApiMock(page);
});

test('all four plans render with prices and features', async ({ page }) => {
  await page.goto('/plans');
  for (const [name, price] of [
    ['Basic', '₹299'],
    ['Standard', '₹499'],
    ['Premium', '₹799'],
    ['Family', '₹1199'],
  ]) {
    const card = page.getByRole('heading', { name, exact: true }).locator('../..');
    await expect(card.getByText(price)).toBeVisible();
  }
  await expect(page.getByText('Popular')).toBeVisible();
  await expect(page.getByText('Free home delivery')).toBeVisible();
});

test('subscribe while signed out redirects to login with returnTo', async ({ page }) => {
  await page.goto('/plans');
  await page.getByRole('button', { name: 'Subscribe' }).first().click();
  await expect(page).toHaveURL('/login?returnTo=%2Fplans');
});

authTest('current plan is highlighted and disabled', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/plans');
  await authExpect(page.getByText('Your plan', { exact: true })).toBeVisible();
  await authExpect(page.getByRole('button', { name: 'Current plan' })).toBeDisabled();
});

authTest('switching plans confirms via dialog and shows success toast', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/plans');
  const standardCard = page
    .getByRole('heading', { name: 'Standard', exact: true })
    .locator('../..');
  await standardCard.getByRole('button', { name: 'Switch plan' }).click();

  const dialog = page.getByRole('dialog');
  await authExpect(dialog.getByText(/₹499\/month/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/standard plan/i),
  ).toBeVisible();
});

authTest('cancel in the confirm dialog makes no change', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/plans');
  await page
    .getByRole('heading', { name: 'Premium', exact: true })
    .locator('../..')
    .getByRole('button', { name: 'Switch plan' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await authExpect(page.getByRole('dialog')).not.toBeVisible();
});

test('plans page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/plans');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
