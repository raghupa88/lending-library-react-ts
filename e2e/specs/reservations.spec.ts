import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupReservationsApiMocks,
  setupBookDetailApiMock,
} from '../helpers/api-mocks';
import {
  MOCK_BOOK_ITEMS,
  MOCK_MY_RESERVATIONS_EMPTY,
  MOCK_MY_RESERVATIONS_WAITING,
  MOCK_MY_RESERVATIONS_READY,
} from '../fixtures/mock-data';

test.beforeEach(async ({ page }) => {
  await setupAllApiMocks(page);
  await setupBookDetailApiMock(page, { success: true, data: MOCK_BOOK_ITEMS[1] });
});

test('joining the waitlist while signed out redirects to login', async ({ page }) => {
  await page.goto('/books/book-2');
  await page.getByRole('button', { name: /join the waitlist/i }).click();
  await expect(page).toHaveURL('/login?returnTo=%2Fbooks%2Fbook-2');
});

authTest('joining the waitlist on an unavailable book shows a toast', async ({
  authenticatedPage: page,
}) => {
  await setupReservationsApiMocks(page, { list: MOCK_MY_RESERVATIONS_EMPTY });
  await page.goto('/books/book-2');
  await page.getByRole('button', { name: /join the waitlist/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/you're on the waitlist/i),
  ).toBeVisible();
});

authTest('an active waitlist reservation shows a leave-waitlist option instead', async ({
  authenticatedPage: page,
}) => {
  await setupReservationsApiMocks(page, { list: MOCK_MY_RESERVATIONS_WAITING });
  await page.goto('/books/book-2');
  await authExpect(page.getByText("You're on the waitlist")).toBeVisible();
  await authExpect(page.getByRole('button', { name: /leave waitlist/i })).toBeVisible();
});

authTest('a ready-for-pickup hold links to the dashboard instead of the waitlist button', async ({
  authenticatedPage: page,
}) => {
  await setupReservationsApiMocks(page, { list: MOCK_MY_RESERVATIONS_READY });
  await page.goto('/books/book-2');
  await authExpect(page.getByText('A copy is being held for you')).toBeVisible();
  await authExpect(page.getByRole('link', { name: /go to dashboard/i })).toBeVisible();
});

authTest('dashboard lists an active waitlist entry with a leave option', async ({
  authenticatedPage: page,
}) => {
  await setupReservationsApiMocks(page, { list: MOCK_MY_RESERVATIONS_WAITING });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await authExpect(reading.getByText('Your waitlist')).toBeVisible();
  await authExpect(
    reading.getByRole('link', { name: 'To Kill a Mockingbird', exact: true }),
  ).toBeVisible();
  await authExpect(reading.getByRole('button', { name: /leave waitlist/i })).toBeVisible();
});

authTest('dashboard lets a ready-for-pickup hold be claimed', async ({
  authenticatedPage: page,
}) => {
  await setupReservationsApiMocks(page, { list: MOCK_MY_RESERVATIONS_READY });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await authExpect(reading.getByText('Ready for pickup')).toBeVisible();
  await reading.getByRole('button', { name: /claim/i }).click();
  await authExpect(
    page
      .getByRole('region', { name: 'Notifications' })
      .getByText(/borrowed "to kill a mockingbird" from your hold/i),
  ).toBeVisible();
});
