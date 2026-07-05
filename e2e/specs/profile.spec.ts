import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupBooksApiMock } from '../helpers/api-mocks';
import { expectNoA11yViolations } from '../helpers/axe';

test('unauthenticated access to /profile redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
});

authTest('profile form is prefilled from the API', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/profile');
  await authExpect(page.getByLabel('First name')).toHaveValue('Test');
  await authExpect(page.getByLabel('Last name')).toHaveValue('Member');
  await authExpect(page.getByLabel('Phone')).toHaveValue('+91 98765 43210');
  await authExpect(page.getByLabel('Delivery address')).toHaveValue('12 Beach Road, Chennai');
  await authExpect(page.getByText('member@example.com')).toBeVisible();
});

authTest('saving the profile PUTs to the API and shows a toast', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/profile');
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/users/') && req.method() === 'PUT')
      requests.push(req.postData() ?? '');
  });
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Reader');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText('Profile saved'),
  ).toBeVisible();
  expect(requests.length).toBeGreaterThan(0);
  expect(requests[0]).toContain('"lastName":"Reader"');
});

authTest('invalid phone is rejected client-side', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/profile');
  await page.getByLabel('Phone').fill('abc');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await authExpect(page.getByRole('alert')).toContainText('Enter a valid phone number');
});

authTest('profile page has no WCAG A/AA violations', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/profile');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
