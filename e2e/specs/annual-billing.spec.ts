import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBooksApiMock,
  setupSubscriptionsApiMock,
} from '../helpers/api-mocks';
import { MOCK_SUBSCRIPTION_ANNUAL } from '../fixtures/mock-data';

test.beforeEach(async ({ page }) => {
  await setupBooksApiMock(page);
  await setupSubscriptionsApiMock(page);
});

test('toggling to annual shows the discounted per-month price and savings note', async ({ page }) => {
  await page.goto('/plans');
  const basicCard = page.getByRole('heading', { name: 'Basic', exact: true }).locator('../..');
  await expect(basicCard.getByText('₹299')).toBeVisible();

  await page.getByRole('tab', { name: 'Annual' }).click();
  await expect(page.getByText('Pay for 10 months, get 12 — 2 months free')).toBeVisible();
  // ₹2990/year ÷ 12 rounds to ₹249/month
  await expect(basicCard.getByText('₹249')).toBeVisible();
});

authTest('subscribing on annual billing shows the annual total in the confirm dialog', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/plans');
  await page.getByRole('tab', { name: 'Annual' }).click();

  const standardCard = page.getByRole('heading', { name: 'Standard', exact: true }).locator('../..');
  await standardCard.getByRole('button', { name: 'Switch plan' }).click();

  const dialog = page.getByRole('dialog');
  await authExpect(dialog.getByText(/₹4990\/year/i)).toBeVisible();
  await authExpect(dialog.getByText(/2 months free/i)).toBeVisible();
});

authTest('an annual subscription shows the yearly total on the dashboard', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupSubscriptionsApiMock(page, { current: MOCK_SUBSCRIPTION_ANNUAL });
  await page.goto('/dashboard');
  const aside = page.getByRole('complementary');
  await authExpect(aside.getByText('₹2990/year')).toBeVisible();
});
