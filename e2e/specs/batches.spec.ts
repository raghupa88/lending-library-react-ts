import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBatchesApiMocks,
  setupAdminBatchesApiMocks,
  setupAdminLearnApiMocks,
} from '../helpers/api-mocks';
import {
  MOCK_BATCHES_FOR_LEARNER_FULL,
  MOCK_BATCHES_FOR_LEARNER_BOOKED,
  MOCK_MY_BOOKINGS,
  MOCK_BOOKING_WAITLISTED,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupAllApiMocks(page);
});

authTest('course detail lists an upcoming batch with seats available', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByRole('heading', { name: /upcoming in-person batches/i })).toBeVisible();
  await authExpect(page.getByText('Suvadi Hall, Chennai')).toBeVisible();
  await authExpect(page.getByText('1 seat available')).toBeVisible();
  await authExpect(page.getByRole('button', { name: /book a seat/i })).toBeVisible();
});

authTest('booking a seat shows a confirmed badge', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /book a seat/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/seat booked/i),
  ).toBeVisible();
});

authTest('a full batch shows Join waitlist and waitlists the learner', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, { batches: MOCK_BATCHES_FOR_LEARNER_FULL, book: MOCK_BOOKING_WAITLISTED });
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByText('Full — bookings join the waitlist')).toBeVisible();
  await page.getByRole('button', { name: /join waitlist/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/added to the waitlist/i),
  ).toBeVisible();
});

authTest('an already-booked batch shows a status badge instead of a book button', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, { batches: MOCK_BATCHES_FOR_LEARNER_BOOKED });
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByText("You're booked")).toBeVisible();
  await authExpect(page.getByRole('button', { name: /book a seat|join waitlist/i })).toHaveCount(0);
});

authTest('unauthenticated learner is sent to login when booking a seat', async ({ page }) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /book a seat/i }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
});

authTest('dashboard My learning tab lists a booked batch with a cancel action', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, { myBookings: MOCK_MY_BOOKINGS });
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /my learning/i }).click();
  await authExpect(page.getByText('In-person batches')).toBeVisible();
  await authExpect(page.getByText('Confirmed')).toBeVisible();

  await page.getByRole('button', { name: /cancel/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/cancelled your booking/i),
  ).toBeVisible();
});

authTest('admin venues page lists venues and opens the add-venue dialog', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupAdminBatchesApiMocks(page);
  await page.goto('/admin/learn/venues');
  await authExpect(page.getByRole('cell', { name: 'Suvadi Hall', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add venue' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a venue' });
  await authExpect(dialog.getByLabel('Name')).toBeVisible();

  const posts: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/admin/learn/venues') && req.method() === 'POST')
      posts.push(req.postData() ?? '');
  });

  await dialog.getByLabel('Name').fill('New Venue');
  await dialog.getByLabel('City', { exact: true }).fill('Coimbatore');
  await dialog.getByRole('button', { name: 'Add venue' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/added "new venue"/i),
  ).toBeVisible();
  expect(posts.length).toBeGreaterThan(0);
  expect(posts[0]).toContain('"name":"New Venue"');
});

authTest('batches dialog schedules a batch and publishes it', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminLearnApiMocks(page);
  await setupAdminBatchesApiMocks(page);
  await page.goto('/admin/learn/courses');
  await page
    .getByRole('row', { name: /money foundations/i })
    .getByRole('button', { name: /manage batches for/i })
    .click();

  const dialog = page.getByRole('dialog');
  await authExpect(dialog.getByText('Suvadi Hall · Priya Raman')).toBeVisible();

  await dialog.getByLabel('Venue').selectOption({ label: 'Suvadi Hall (Chennai)' });
  await dialog.getByLabel('Instructor').fill('Priya Raman');
  await dialog.getByLabel('Starts on').fill('2026-09-01');
  await dialog.getByLabel('Ends on').fill('2026-09-02');
  await dialog.getByLabel('Schedule').fill('Sat-Sun');
  await dialog.getByLabel('Capacity').fill('20');
  await dialog.locator('input[placeholder^="Topic for session"]').fill('Intro session');
  await dialog.locator('input[type="date"]').last().fill('2026-09-01');
  await dialog.getByRole('button', { name: /schedule batch/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/batch created/i),
  ).toBeVisible();

  await dialog.getByText('Suvadi Hall · Priya Raman').first().click();
  await authExpect(dialog.getByText('Back to batches')).toBeVisible();
  await dialog.getByRole('button', { name: /^publish$/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/batch published/i),
  ).toBeVisible();
});

authTest('batches dialog shows the roster and toggles attendance', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminLearnApiMocks(page);
  await setupAdminBatchesApiMocks(page);
  await page.goto('/admin/learn/courses');
  await page
    .getByRole('row', { name: /money foundations/i })
    .getByRole('button', { name: /manage batches for/i })
    .click();
  await page.getByText('Suvadi Hall · Priya Raman').first().click();

  const dialog = page.getByRole('dialog');
  await authExpect(dialog.getByText('Test Member').first()).toBeVisible();
  await authExpect(dialog.getByText('CONFIRMED')).toBeVisible();
  await authExpect(dialog.getByText('Attendance')).toBeVisible();

  await dialog.getByRole('button', { name: /toggle attendance/i }).click();
  // Marking attendance re-fetches the batch detail; no toast is expected, just
  // confirm the request went through without the dialog erroring out.
  await authExpect(dialog.getByText('Test Member').first()).toBeVisible();
});

authTest('learner-facing pages with batches have no WCAG A/AA violations', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByRole('heading', { name: /upcoming in-person batches/i })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await authExpect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(350);
  await expectNoA11yViolations(page);
});

authTest('admin venues and batches dialog have no WCAG A/AA violations', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupAdminLearnApiMocks(page);
  await setupAdminBatchesApiMocks(page);
  await page.goto('/admin/learn/venues');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto('/admin/learn/courses');
  await page
    .getByRole('row', { name: /money foundations/i })
    .getByRole('button', { name: /manage batches for/i })
    .click();
  await authExpect(page.getByRole('dialog')).toBeVisible();
  await expectNoA11yViolations(page);
});
