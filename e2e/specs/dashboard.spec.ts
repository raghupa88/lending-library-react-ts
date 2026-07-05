import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupBooksApiMock, setupLoansApiMock } from '../helpers/api-mocks';
import { MOCK_LOANS_EMPTY } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

authTest('greeting and stat cards reflect real loans', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  await authExpect(page.getByRole('heading', { level: 1 })).toContainText(', Test');
  // 2 active loans, 1 due soon (due in 1 day), 1 returned
  await authExpect(page.getByText('Borrowed now').locator('..')).toContainText('2');
  await authExpect(page.getByText('Due soon').locator('..')).toContainText('1');
  await authExpect(page.getByText('Books read').locator('..')).toContainText('1');
});

authTest('currently-reading tab lists active loans with due badges', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await authExpect(
    reading.getByRole('link', { name: 'The Great Gatsby', exact: true }),
  ).toBeVisible();
  await authExpect(
    reading.getByRole('link', { name: 'Ponniyin Selvan', exact: true }),
  ).toBeVisible();
  await authExpect(reading.getByText(/due in 11 days/i)).toBeVisible();
  await authExpect(reading.getByText(/due in 1 day/i)).toBeVisible();
});

authTest('returning a book calls the API and shows a toast', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Return' }).first().click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/returned "the great gatsby"/i),
  ).toBeVisible();
});

authTest('history tab shows past loans', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /history/i }).click();
  const history = page.getByRole('tabpanel');
  await authExpect(history.getByText('To Kill a Mockingbird')).toBeVisible();
  await authExpect(history.getByText(/returned/i).first()).toBeVisible();
});

authTest('empty loans show the browse empty state', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupLoansApiMock(page, { list: MOCK_LOANS_EMPTY });
  await page.goto('/dashboard');
  await authExpect(page.getByText('Nothing borrowed right now')).toBeVisible();
  await authExpect(page.getByRole('link', { name: 'Browse the shelf' })).toBeVisible();
});

authTest('subscription card shows the current plan with change link', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  const aside = page.getByRole('complementary');
  await authExpect(aside.getByText('basic')).toBeVisible();
  await authExpect(aside.getByText(/₹299\/month/)).toBeVisible();
  await authExpect(aside.getByRole('link', { name: 'Change plan' })).toBeVisible();
});

authTest('edit profile link navigates to /profile', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: /edit profile/i }).click();
  await authExpect(page).toHaveURL('/profile');
});

authTest('dashboard has no WCAG A/AA violations', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});
