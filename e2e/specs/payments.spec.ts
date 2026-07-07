import { test, expect, type Locator } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupLearnApiMocks, setupBatchesApiMocks } from '../helpers/api-mocks';
import {
  MOCK_COURSE_DETAIL_PAID,
  MOCK_ENROLLMENT_CREATED_PAID,
  MOCK_PAYMENT_REQUIRED_FAILURE,
  MOCK_PAYMENT_DECLINED_FAILURE,
  MOCK_ENROLLMENTS_EMPTY,
  MOCK_BATCHES_FOR_LEARNER_PAID,
  MOCK_BATCHES_FOR_LEARNER_PAID_FULL,
  MOCK_BOOKING_CONFIRMED_PAID,
  MOCK_PAYMENT_DECLINED_BATCH_FAILURE,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupAllApiMocks(page);
});

async function fillCard(dialog: Locator, cardNumber: string) {
  await dialog.getByLabel(/cardholder name/i).fill('Test Member');
  await dialog.getByLabel(/card number/i).fill(cardNumber);
  await dialog.getByLabel(/month/i).fill('12');
  await dialog.getByLabel(/year/i).fill('2030');
  await dialog.getByLabel(/cvc/i).fill('123');
}

authTest('a paid course shows the price on the enroll button and opens checkout', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { detail: MOCK_COURSE_DETAIL_PAID, enrollments: MOCK_ENROLLMENTS_EMPTY });
  await page.goto('/learn/paid-course');
  const enrollButton = page.getByRole('button', { name: /enroll — ₹499\.00/i });
  await authExpect(enrollButton).toBeVisible();

  await enrollButton.click();
  const dialog = page.getByRole('dialog', { name: /enroll in advanced derivatives/i });
  await authExpect(dialog).toBeVisible();
  await authExpect(dialog.getByText('₹499.00').first()).toBeVisible();
});

authTest('checkout validates the card number before submitting', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { detail: MOCK_COURSE_DETAIL_PAID, enrollments: MOCK_ENROLLMENTS_EMPTY });
  await page.goto('/learn/paid-course');
  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/cardholder name/i).fill('Test Member');
  await dialog.getByLabel(/card number/i).fill('123');
  await dialog.getByLabel(/month/i).fill('12');
  await dialog.getByLabel(/year/i).fill('2030');
  await dialog.getByLabel(/cvc/i).fill('123');
  await dialog.getByRole('button', { name: /^pay ₹499\.00$/i }).click();
  await authExpect(dialog.getByText(/valid card number/i)).toBeVisible();
});

authTest('a successful payment enrolls and shows the charged amount', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    detail: MOCK_COURSE_DETAIL_PAID,
    enrollments: MOCK_ENROLLMENTS_EMPTY,
    enroll: MOCK_ENROLLMENT_CREATED_PAID,
  });
  await page.goto('/learn/paid-course');
  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();

  const dialog = page.getByRole('dialog');
  await fillCard(dialog, '4242424242424242');
  await dialog.getByRole('button', { name: /^pay ₹499\.00$/i }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/charged ₹499\.00/i),
  ).toBeVisible();
  await authExpect(dialog).toHaveCount(0);
});

authTest('a declined card shows an inline error and keeps the dialog open', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    detail: MOCK_COURSE_DETAIL_PAID,
    enrollments: MOCK_ENROLLMENTS_EMPTY,
    enroll: MOCK_PAYMENT_DECLINED_FAILURE,
  });
  await page.goto('/learn/paid-course');
  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();

  const dialog = page.getByRole('dialog');
  await fillCard(dialog, '4000000000000002');
  await dialog.getByRole('button', { name: /^pay ₹499\.00$/i }).click();

  await authExpect(dialog.getByRole('alert').getByText(/declined/i)).toBeVisible();
  await authExpect(dialog).toBeVisible();
});

authTest('backend rejecting a missing payment surfaces the server message', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    detail: MOCK_COURSE_DETAIL_PAID,
    enrollments: MOCK_ENROLLMENTS_EMPTY,
    enroll: MOCK_PAYMENT_REQUIRED_FAILURE,
  });
  await page.goto('/learn/paid-course');
  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();

  const dialog = page.getByRole('dialog');
  await fillCard(dialog, '4242424242424242');
  await dialog.getByRole('button', { name: /^pay ₹499\.00$/i }).click();
  await authExpect(dialog.getByRole('alert').getByText(/payment details are required/i)).toBeVisible();
});

authTest('unauthenticated learner is sent to login instead of opening checkout', async ({ page }) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { detail: MOCK_COURSE_DETAIL_PAID });
  await page.goto('/learn/paid-course');
  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

authTest('a paid batch shows the fee on the book button and opens checkout', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, { batches: MOCK_BATCHES_FOR_LEARNER_PAID });
  await page.goto('/learn/money-foundations');
  const bookButton = page.getByRole('button', { name: /book a seat — ₹350\.00/i });
  await authExpect(bookButton).toBeVisible();

  await bookButton.click();
  const dialog = page.getByRole('dialog', { name: /book a seat/i });
  await authExpect(dialog).toBeVisible();
  await authExpect(dialog.getByText('₹350.00').first()).toBeVisible();
});

authTest('a full paid batch shows a Full badge with no book button', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, { batches: MOCK_BATCHES_FOR_LEARNER_PAID_FULL });
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByText('Full', { exact: true }).first()).toBeVisible();
  await authExpect(page.getByRole('button', { name: /book a seat|join waitlist/i })).toHaveCount(0);
});

authTest('paying for a batch confirms the seat and shows the charged amount', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, {
    batches: MOCK_BATCHES_FOR_LEARNER_PAID,
    book: MOCK_BOOKING_CONFIRMED_PAID,
  });
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /book a seat — ₹350\.00/i }).click();

  const dialog = page.getByRole('dialog');
  await fillCard(dialog, '4242424242424242');
  await dialog.getByRole('button', { name: /^pay ₹350\.00$/i }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/charged ₹350\.00/i),
  ).toBeVisible();
});

authTest('a declined batch payment keeps the dialog open with an inline error', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupBatchesApiMocks(page, {
    batches: MOCK_BATCHES_FOR_LEARNER_PAID,
    book: MOCK_PAYMENT_DECLINED_BATCH_FAILURE,
  });
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /book a seat — ₹350\.00/i }).click();

  const dialog = page.getByRole('dialog');
  await fillCard(dialog, '4000000000000002');
  await dialog.getByRole('button', { name: /^pay ₹350\.00$/i }).click();
  await authExpect(dialog.getByRole('alert').getByText(/declined/i)).toBeVisible();
});

authTest('checkout dialog has no WCAG A/AA violations in both themes', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { detail: MOCK_COURSE_DETAIL_PAID, enrollments: MOCK_ENROLLMENTS_EMPTY });
  await page.goto('/learn/paid-course');
  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();
  await authExpect(page.getByRole('dialog')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.keyboard.press('Escape');
  await authExpect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await authExpect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(350);

  await page.getByRole('button', { name: /enroll — ₹499\.00/i }).click();
  await authExpect(page.getByRole('dialog')).toBeVisible();
  await expectNoA11yViolations(page);
});
