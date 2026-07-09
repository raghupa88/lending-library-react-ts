import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBooksApiMock,
  setupRegisterApiMock,
  setupGiftsApiMocks,
} from '../helpers/api-mocks';
import {
  MOCK_REGISTER_WITH_GIFT_SUCCESS,
  MOCK_MY_GIFTS,
  MOCK_REDEEM_GIFT_FAILURE,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test('unauthenticated access to /gift redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/gift');
  await expect(page).toHaveURL('/login');
});

authTest('gift page renders Send and Redeem tabs with plans', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/gift');
  await authExpect(page.getByRole('tab', { name: 'Send a gift' })).toBeVisible();
  await authExpect(page.getByRole('tab', { name: 'Redeem a gift' })).toBeVisible();
  await authExpect(page.getByRole('heading', { name: 'Basic', exact: true })).toBeVisible();
  await authExpect(page.getByRole('heading', { name: 'Premium', exact: true })).toBeVisible();
});

authTest('sending a gift charges the card and shows the gift code', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/gift');

  await page.getByLabel("Recipient's email").fill('friend@example.com');
  const basicCard = page.getByRole('heading', { name: 'Basic', exact: true }).locator('../..');
  await basicCard.getByRole('button', { name: 'Send Basic as a gift' }).click();

  const dialog = page.getByRole('dialog');
  await authExpect(dialog).toBeVisible();
  await dialog.getByLabel('Cardholder name').fill('Test Member');
  await dialog.getByLabel('Card number').fill('4242 4242 4242 4242');
  await dialog.getByLabel('Month').fill('12');
  await dialog.getByLabel('Year').fill('2030');
  await dialog.getByLabel('CVC').fill('123');
  await dialog.getByRole('button', { name: /Pay/ }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Gift sent! Charged ₹199.00'),
  ).toBeVisible();
  await authExpect(page.getByText('GIFTCODE1')).toBeVisible();
});

authTest('gifts sent list shows purchased gifts with status badges', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupGiftsApiMocks(page, { mine: MOCK_MY_GIFTS });
  await page.goto('/gift');

  await authExpect(page.getByText('friend@example.com').first()).toBeVisible();
  await authExpect(page.getByText('Pending')).toBeVisible();
  await authExpect(page.getByText('Redeemed')).toBeVisible();
});

authTest('redeeming a valid gift code shows a success toast', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/gift');
  await page.getByRole('tab', { name: 'Redeem a gift' }).click();
  await page.getByLabel('Gift code').fill('GIFTCODE1');
  await page.getByRole('button', { name: 'Redeem gift' }).click();

  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText("Redeemed! You're now on the premium plan."),
  ).toBeVisible();
});

authTest('redeeming an unknown gift code shows an error toast', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupGiftsApiMocks(page, { redeem: MOCK_REDEEM_GIFT_FAILURE });
  await page.goto('/gift');
  await page.getByRole('tab', { name: 'Redeem a gift' }).click();
  await page.getByLabel('Gift code').fill('BADCODE1');
  await page.getByRole('button', { name: 'Redeem gift' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Unknown gift code'),
  ).toBeVisible();
});

test('register page prefills the gift code from a ?gift= link', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/register?gift=XYZ98765');
  await expect(page.getByLabel('Gift code')).toHaveValue('XYZ98765');
});

test('registering with a gift code sends it to the API', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupRegisterApiMock(page, MOCK_REGISTER_WITH_GIFT_SUCCESS);
  await page.goto('/register');

  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/auth/register')) requests.push(req.postData() ?? '');
  });

  await page.getByLabel('Full name').fill('Giftee User');
  await page.getByLabel('Email').fill('giftee@example.com');
  await page.getByLabel('Gift code').fill('XYZ98765');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('/dashboard');
  expect(requests.length).toBeGreaterThan(0);
  expect(requests[0]).toContain('"giftCode":"XYZ98765"');
});

authTest('gift page has no WCAG A/AA violations', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/gift');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
