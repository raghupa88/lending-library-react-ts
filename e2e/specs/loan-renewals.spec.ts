import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupLoansApiMock } from '../helpers/api-mocks';
import {
  MOCK_RENEW_ACTIVE_WAITLIST_FAILURE,
  MOCK_LOANS_ONE_RENEWED,
} from '../fixtures/mock-data';

authTest.beforeEach(async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
});

authTest('renewing an active loan shows a success toast with the new due date', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await reading.getByRole('button', { name: 'Renew' }).first().click();
  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText(/renewed "the great gatsby"/i),
  ).toBeVisible();
});

authTest('a renewal blocked by an active waitlist surfaces the server message', async ({
  authenticatedPage: page,
}) => {
  await setupLoansApiMock(page, { renewed: MOCK_RENEW_ACTIVE_WAITLIST_FAILURE });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await reading.getByRole('button', { name: 'Renew' }).first().click();
  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText(/someone else is waiting for this book/i),
  ).toBeVisible();
});

authTest('a loan that has already been renewed shows a Renewed badge instead of the button', async ({
  authenticatedPage: page,
}) => {
  await setupLoansApiMock(page, { list: MOCK_LOANS_ONE_RENEWED });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  const firstLoanCard = reading.getByText('The Great Gatsby').locator('../..');
  await authExpect(firstLoanCard.getByText('Renewed')).toBeVisible();
  await authExpect(firstLoanCard.getByRole('button', { name: 'Renew' })).toHaveCount(0);
});
