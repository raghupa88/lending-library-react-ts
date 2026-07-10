import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupFeatureFlagsApiMocks, setupOrganizationsApiMocks } from '../helpers/api-mocks';
import { MOCK_ENABLED_FLAGS_NO_B2B, MOCK_MY_ORGANIZATION } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

authTest('admin feature flags page lists flags with status and updated date', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/admin/feature-flags');
  await authExpect(page.getByRole('heading', { name: 'Feature flags' })).toBeVisible();
  await authExpect(page.getByRole('cell', { name: 'b2b_tier' })).toBeVisible();
  await authExpect(page.getByText('Enabled', { exact: true })).toBeVisible();
});

authTest('admin can add a new feature flag', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/admin/feature-flags');

  await page.getByRole('button', { name: 'Add flag' }).click();
  const dialog = page.getByRole('dialog');
  await authExpect(dialog).toBeVisible();
  await dialog.getByLabel('Key').fill('new_flag');
  await dialog.getByLabel('Name').fill('New Flag');
  await dialog.getByRole('button', { name: 'Add flag' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Added "new_flag" (disabled by default)'),
  ).toBeVisible();
});

authTest('admin can disable an enabled flag', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/admin/feature-flags');

  await page.getByRole('row', { name: /b2b_tier/ }).getByRole('button', { name: 'Disable' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Disabled "b2b_tier"'),
  ).toBeVisible();
});

authTest('admin feature flags page has no WCAG A/AA violations', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/admin/feature-flags');
  await authExpect(page.getByRole('heading', { name: 'Feature flags' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('footer hides the business-account link when b2b_tier is disabled', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupFeatureFlagsApiMocks(page, { enabled: MOCK_ENABLED_FLAGS_NO_B2B });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'For schools & businesses' })).toHaveCount(0);
});

test('footer shows the business-account link when b2b_tier is enabled', async ({ page }) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'For schools & businesses' })).toBeVisible();
});

test('plans page hides the business-account link when b2b_tier is disabled', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupFeatureFlagsApiMocks(page, { enabled: MOCK_ENABLED_FLAGS_NO_B2B });
  await page.goto('/plans');
  await expect(page.getByRole('link', { name: 'Set up a business account →' })).toHaveCount(0);
});

test('register hides the organization code field when b2b_tier is disabled', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupFeatureFlagsApiMocks(page, { enabled: MOCK_ENABLED_FLAGS_NO_B2B });
  await page.goto('/register');
  await expect(page.getByLabel('Organization code')).toHaveCount(0);
});

authTest('organization page shows an empty state for non-owners when b2b_tier is disabled', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupFeatureFlagsApiMocks(page, { enabled: MOCK_ENABLED_FLAGS_NO_B2B });
  await page.goto('/organization');
  await authExpect(
    page.getByRole('heading', { name: "Business accounts aren't available right now" }),
  ).toBeVisible();
});

authTest('organization page still shows the dashboard for existing owners when b2b_tier is disabled', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupFeatureFlagsApiMocks(page, { enabled: MOCK_ENABLED_FLAGS_NO_B2B });
  await setupOrganizationsApiMocks(page, { mine: MOCK_MY_ORGANIZATION });
  await page.goto('/organization');
  await authExpect(page.getByRole('heading', { name: 'Chennai Public School' })).toBeVisible();
});
