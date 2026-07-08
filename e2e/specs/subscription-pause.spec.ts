import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupSubscriptionsApiMock } from '../helpers/api-mocks';
import { MOCK_SUBSCRIPTION_PAUSED } from '../fixtures/mock-data';

authTest.beforeEach(async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
});

authTest('pausing an active subscription shows a success toast', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/dashboard');
  const aside = page.getByRole('complementary');
  await aside.getByRole('button', { name: /pause a month/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/your subscription is paused/i),
  ).toBeVisible();
});

authTest('a paused subscription shows the paused badge and a resume action instead of pause/change', async ({
  authenticatedPage: page,
}) => {
  await setupSubscriptionsApiMock(page, { current: MOCK_SUBSCRIPTION_PAUSED });
  await page.goto('/dashboard');
  const aside = page.getByRole('complementary');
  await authExpect(aside.getByText('Paused', { exact: true })).toBeVisible();
  await authExpect(aside.getByText(/paused until/i)).toBeVisible();
  await authExpect(aside.getByRole('button', { name: /resume now/i })).toBeVisible();
  await authExpect(aside.getByRole('link', { name: 'Change plan' })).toHaveCount(0);
  await authExpect(aside.getByRole('button', { name: /pause a month/i })).toHaveCount(0);
});

authTest('resuming a paused subscription shows a success toast', async ({
  authenticatedPage: page,
}) => {
  await setupSubscriptionsApiMock(page, { current: MOCK_SUBSCRIPTION_PAUSED });
  await page.goto('/dashboard');
  const aside = page.getByRole('complementary');
  await aside.getByRole('button', { name: /resume now/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/active again/i),
  ).toBeVisible();
});
