import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupAdminAnalyticsApiMocks } from '../helpers/api-mocks';
import { MOCK_ADMIN_ANALYTICS_EMPTY } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

authTest('analytics page shows stat tiles, funnel, revenue and attendance', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupAdminAnalyticsApiMocks(page);
  await page.goto('/admin/learn/analytics');

  await authExpect(page.getByText('2', { exact: true }).first()).toBeVisible();
  await authExpect(page.getByText('Total enrollments')).toBeVisible();
  await authExpect(page.getByText('₹255.00', { exact: true }).first()).toBeVisible();
  await authExpect(page.getByText('Total revenue')).toBeVisible();
  await authExpect(page.getByText('100%')).toBeVisible();

  await authExpect(page.getByText('Enrollments over time')).toBeVisible();
  await authExpect(page.getByText('Completion funnel')).toBeVisible();
  await authExpect(page.getByText('Enrolled')).toBeVisible();
  await authExpect(page.getByText('Started a lesson')).toBeVisible();
  await authExpect(page.getByText('Earned a certificate')).toBeVisible();

  await authExpect(page.getByText('Revenue by course')).toBeVisible();
  await authExpect(page.getByText('Analytics Course')).toBeVisible();

  await authExpect(page.getByText('Batch attendance')).toBeVisible();
  await authExpect(page.getByText('100/100')).toBeVisible();
});

authTest('analytics nav link is visible in the admin sidebar', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/admin');
  await authExpect(
    page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Analytics' }),
  ).toBeVisible();
});

authTest('empty analytics shows empty states instead of broken charts', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupAdminAnalyticsApiMocks(page, MOCK_ADMIN_ANALYTICS_EMPTY);
  await page.goto('/admin/learn/analytics');

  await authExpect(page.getByText('No enrollments yet.')).toBeVisible();
  await authExpect(page.getByText('No paid enrollments or bookings yet.')).toBeVisible();
  await authExpect(page.getByText('Enrolled')).toBeVisible();
});

authTest('exporting CSV downloads a file with the aggregate data', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminAnalyticsApiMocks(page);
  await page.goto('/admin/learn/analytics');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export csv/i }).click(),
  ]);
  authExpect(download.suggestedFilename()).toBe('suvadi-learn-analytics.csv');
});

authTest('analytics page has no WCAG A/AA violations in both themes', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminAnalyticsApiMocks(page);
  await page.goto('/admin/learn/analytics');
  await authExpect(page.getByRole('heading', { name: 'Learn analytics' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.reload();
  await authExpect(page.getByRole('heading', { name: 'Learn analytics' })).toBeVisible();
  await expectNoA11yViolations(page);
});
