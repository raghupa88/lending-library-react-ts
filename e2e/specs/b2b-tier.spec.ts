import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBooksApiMock,
  setupRegisterApiMock,
  setupOrganizationsApiMocks,
  setupFeatureFlagsApiMocks,
} from '../helpers/api-mocks';
import {
  MOCK_MY_ORGANIZATION,
  MOCK_JOIN_ORGANIZATION_FAILURE,
  MOCK_REGISTER_WITH_ORG_SUCCESS,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test('unauthenticated access to /organization redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/organization');
  await expect(page).toHaveURL('/login');
});

authTest('organization page renders Start and Join tabs with plans when no account exists', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/organization');
  await authExpect(page.getByRole('tab', { name: 'Start a business account' })).toBeVisible();
  await authExpect(page.getByRole('tab', { name: 'Join with a code' })).toBeVisible();
  await authExpect(page.getByRole('heading', { name: 'Basic', exact: true })).toBeVisible();
  await authExpect(page.getByRole('heading', { name: 'Premium', exact: true })).toBeVisible();
});

authTest('starting a business account charges the seat block and shows success', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/organization');

  await page.getByLabel('Organization name').fill('Chennai Public School');
  await page.getByLabel('Number of seats').fill('10');
  const basicCard = page.getByRole('heading', { name: 'Basic', exact: true }).locator('../..');
  await basicCard.getByRole('button', { name: 'Start with Basic' }).click();

  const dialog = page.getByRole('dialog');
  await authExpect(dialog).toBeVisible();
  await dialog.getByLabel('Cardholder name').fill('Owen Owner');
  await dialog.getByLabel('Card number').fill('4242 4242 4242 4242');
  await dialog.getByLabel('Month').fill('12');
  await dialog.getByLabel('Year').fill('2030');
  await dialog.getByLabel('CVC').fill('123');
  await dialog.getByRole('button', { name: /Pay/ }).click();

  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText('Business account created! Charged ₹3990.00'),
  ).toBeVisible();
});

authTest('joining an organization with a valid code shows a success toast', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/organization');
  await page.getByRole('tab', { name: 'Join with a code' }).click();
  await page.getByLabel('Organization code').fill('ORGCODE1');
  await page.getByRole('button', { name: 'Join organization' }).click();

  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText("Joined! You're now on the premium plan."),
  ).toBeVisible();
});

authTest('joining with an unknown code shows an error toast', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupOrganizationsApiMocks(page, { join: MOCK_JOIN_ORGANIZATION_FAILURE });
  await page.goto('/organization');
  await page.getByRole('tab', { name: 'Join with a code' }).click();
  await page.getByLabel('Organization code').fill('BADCODE1');
  await page.getByRole('button', { name: 'Join organization' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Unknown organization code'),
  ).toBeVisible();
});

authTest('owning a business account shows the dashboard with join code and roster', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupOrganizationsApiMocks(page, { mine: MOCK_MY_ORGANIZATION });
  await page.goto('/organization');

  await authExpect(page.getByRole('heading', { name: 'Chennai Public School' })).toBeVisible();
  await authExpect(page.getByText('ORGCODE1')).toBeVisible();
  await authExpect(page.getByText('1 / 10')).toBeVisible();
  await authExpect(page.getByText('teammate@example.com')).toBeVisible();
});

authTest('removing a member shows a success toast', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupOrganizationsApiMocks(page, { mine: MOCK_MY_ORGANIZATION });
  await page.goto('/organization');

  await page.getByRole('button', { name: 'Remove' }).click();
  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText('Removed Team Member from your organization'),
  ).toBeVisible();
});

test('register page prefills the organization code from an ?org= link', async ({ page }) => {
  await setupBooksApiMock(page);
  await setupFeatureFlagsApiMocks(page);
  await page.goto('/register?org=ORGCODE1');
  await expect(page.getByLabel('Organization code')).toHaveValue('ORGCODE1');
});

test('registering with an organization code sends it to the API', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupRegisterApiMock(page, MOCK_REGISTER_WITH_ORG_SUCCESS);
  await page.goto('/register');

  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/auth/register')) requests.push(req.postData() ?? '');
  });

  await page.getByLabel('Full name').fill('Org Member');
  await page.getByLabel('Email').fill('orgmember@example.com');
  await page.getByLabel('Organization code').fill('ORGCODE1');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('/dashboard');
  expect(requests.length).toBeGreaterThan(0);
  expect(requests[0]).toContain('"orgCode":"ORGCODE1"');
});

authTest('organization page has no WCAG A/AA violations', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/organization');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

authTest('organization dashboard has no WCAG A/AA violations', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupOrganizationsApiMocks(page, { mine: MOCK_MY_ORGANIZATION });
  await page.goto('/organization');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
