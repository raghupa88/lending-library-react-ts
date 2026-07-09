import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBooksApiMock,
  setupRegisterApiMock,
  setupProfileApiMock,
  setupSubscriptionsApiMock,
} from '../helpers/api-mocks';
import {
  MOCK_REGISTER_WITH_REFERRAL_SUCCESS,
  MOCK_PROFILE_WITH_CREDIT,
  MOCK_SUBSCRIBE_WITH_REFERRAL_CREDIT_SUCCESS,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test('register page prefills the referral code from a ?ref= link', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register?ref=ABC12345');
  await expect(page.getByLabel('Referral code')).toHaveValue('ABC12345');
});

test('registering with a referral code sends it to the API', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupRegisterApiMock(page, MOCK_REGISTER_WITH_REFERRAL_SUCCESS);
  await page.goto('/register');

  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/auth/register')) requests.push(req.postData() ?? '');
  });

  await page.getByLabel('Full name').fill('Referred User');
  await page.getByLabel('Email').fill('referred@example.com');
  await page.getByLabel('Referral code').fill('MEMBERSEED01');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('/dashboard');
  expect(requests.length).toBeGreaterThan(0);
  expect(requests[0]).toContain('"referralCode":"MEMBERSEED01"');
});

test('register page has no WCAG A/AA violations with the referral field', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register');
  await expect(page.getByLabel('Referral code')).toBeVisible();
  await expectNoA11yViolations(page);
});

authTest('profile page shows the referral code and credit balance', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupProfileApiMock(page, { profile: MOCK_PROFILE_WITH_CREDIT });
  await page.goto('/profile');
  await authExpect(page.getByText('MEMBERSEED01')).toBeVisible();
  await authExpect(page.getByText('₹100.00')).toBeVisible();
});

authTest('copying the referral link shows a confirmation toast', async ({
  authenticatedPage: page,
}) => {
  await page.context().grantPermissions(['clipboard-write']);
  await setupAllApiMocks(page);
  await page.goto('/profile');
  await authExpect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await page.getByRole('button', { name: 'Copy link' }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Referral link copied'),
  ).toBeVisible();
});

authTest('subscribing with referral credit mentions the credit in the success toast', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupSubscriptionsApiMock(page, { subscribe: MOCK_SUBSCRIBE_WITH_REFERRAL_CREDIT_SUCCESS });
  await page.goto('/plans');

  const standardCard = page.getByRole('heading', { name: 'Standard', exact: true }).locator('../..');
  await standardCard.getByRole('button', { name: 'Switch plan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText('₹100 in referral credit was applied'),
  ).toBeVisible();
});
