import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupLearnApiMocks, setupTestsApiMocks } from '../helpers/api-mocks';
import {
  MOCK_ENROLLMENTS,
  MOCK_TESTS_EXHAUSTED,
  MOCK_ATTEMPT_RESULT_FAIL,
  MOCK_CERTIFICATE_VERIFY_NOT_FOUND,
  MOCK_CERTIFICATES_EMPTY,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupAllApiMocks(page);
});

authTest('course detail lists tests with attempt status for an enrolled learner', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { enrollments: MOCK_ENROLLMENTS });
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByText('Module 1 Check')).toBeVisible();
  await authExpect(page.getByRole('link', { name: /take test/i })).toBeVisible();
});

authTest('exhausted attempts disables Take test for an unpassed test', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { enrollments: MOCK_ENROLLMENTS });
  await setupTestsApiMocks(page, { tests: MOCK_TESTS_EXHAUSTED });
  await page.goto('/learn/money-foundations');
  const takeTest = page.getByRole('link', { name: /take test/i });
  await authExpect(takeTest).toHaveAttribute('aria-disabled', 'true');
});

authTest('unauthenticated access to the test runner redirects to login', async ({ page }) => {
  await page.goto('/learn/money-foundations/test/test-1');
  await expect(page).toHaveURL(/\/login/);
});

authTest('test intro shows pass mark, time limit and attempts left', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations/test/test-1');
  await authExpect(page.getByRole('heading', { name: 'Module 1 Check' })).toBeVisible();
  await authExpect(page.getByText('70%')).toBeVisible();
  await authExpect(page.getByText('10 min')).toBeVisible();
  await authExpect(page.getByText('2 of 2')).toBeVisible();
});

authTest('full test run: start, answer, review, submit, pass, view certificate', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations/test/test-1');
  await page.getByRole('button', { name: /start test/i }).click();
  await authExpect(page.getByText('Question 1 of 2')).toBeVisible();

  await page.getByText('Investing', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await authExpect(page.getByText('Question 2 of 2')).toBeVisible();

  await page.getByText('False', { exact: true }).click();
  await page.getByRole('button', { name: /review answers/i }).click();
  await authExpect(page.getByText('Review your answers')).toBeVisible();
  await authExpect(page.getByText('Investing', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /submit test/i }).click();
  await authExpect(page.getByRole('heading', { name: 'You passed!' })).toBeVisible();
  await authExpect(page.getByText('Scored 100%')).toBeVisible();
  await authExpect(page.getByText('Certificate earned!')).toBeVisible();

  await page.getByRole('link', { name: /view certificate/i }).click();
  await authExpect(page).toHaveURL('/certificates/SUV-ABCD1234');
  await authExpect(page.getByText('Valid certificate')).toBeVisible();
  await authExpect(page.getByRole('heading', { name: 'Test Member' })).toBeVisible();
});

authTest('a failed attempt shows per-question feedback and a Retake option', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupTestsApiMocks(page, { submit: MOCK_ATTEMPT_RESULT_FAIL });
  await page.goto('/learn/money-foundations/test/test-1');
  await page.getByRole('button', { name: /start test/i }).click();
  await page.getByText('Saving', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText('True', { exact: true }).click();
  await page.getByRole('button', { name: /review answers/i }).click();
  await page.getByRole('button', { name: /submit test/i }).click();

  await authExpect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible();
  await authExpect(page.getByText('Scored 0%')).toBeVisible();
  await authExpect(page.getByText('Correct answer: Investing')).toBeVisible();
  await authExpect(page.getByRole('button', { name: /retake test/i })).toBeVisible();
});

authTest('review screen lets you edit an answer before submitting', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations/test/test-1');
  await page.getByRole('button', { name: /start test/i }).click();
  await page.getByText('Investing', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /review answers/i }).click();
  await authExpect(page.getByText('Not answered')).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).nth(1).click();
  await authExpect(page.getByText('Question 2 of 2')).toBeVisible();
});

authTest('a keyboard-only test run completes end to end', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations/test/test-1');

  // Tab to "Start test" and activate with the keyboard, no mouse from here on.
  await page.getByRole('button', { name: /start test/i }).focus();
  await page.keyboard.press('Enter');
  await authExpect(page.getByText('Question 1 of 2')).toBeVisible();

  // Radio group: Tab onto the first option, arrow down to the second, select with Space.
  await page.getByRole('radio', { name: 'Saving' }).focus();
  await page.keyboard.press('ArrowDown');
  await authExpect(page.getByRole('radio', { name: 'Investing' })).toBeChecked();
  await page.getByRole('button', { name: 'Next' }).focus();
  await page.keyboard.press('Enter');
  await authExpect(page.getByText('Question 2 of 2')).toBeVisible();

  await page.getByRole('radio', { name: 'True' }).focus();
  await page.keyboard.press('ArrowDown');
  await authExpect(page.getByRole('radio', { name: 'False' })).toBeChecked();
  await page.getByRole('button', { name: /review answers/i }).focus();
  await page.keyboard.press('Enter');
  await authExpect(page.getByText('Review your answers')).toBeVisible();

  await page.getByRole('button', { name: /submit test/i }).focus();
  await page.keyboard.press('Enter');
  await authExpect(page.getByRole('heading', { name: 'You passed!' })).toBeVisible();
});

authTest('dashboard My learning tab lists earned certificates', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /my learning/i }).click();
  await authExpect(page.getByRole('link', { name: /money foundations/i }).last()).toBeVisible();
});

authTest('dashboard hides the certificates section when there are none', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupTestsApiMocks(page, { certificates: MOCK_CERTIFICATES_EMPTY });
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /my learning/i }).click();
  await authExpect(page.getByText('Certificates')).toHaveCount(0);
});

test('certificate verify page shows a not-found state for an unknown serial', async ({ page }) => {
  await setupTestsApiMocks(page, { verify: MOCK_CERTIFICATE_VERIFY_NOT_FOUND });
  await page.goto('/certificates/SUV-NOPE');
  await expect(page.getByRole('heading', { name: 'Certificate not found' })).toBeVisible();
});

authTest('test runner has no WCAG A/AA violations in both themes', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations/test/test-1');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: /start test/i }).click();
  await authExpect(page.getByText('Question 1 of 2')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await authExpect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(350);
  await expectNoA11yViolations(page);
});

test('certificate verify page has no WCAG A/AA violations', async ({ page }) => {
  await setupTestsApiMocks(page);
  await page.goto('/certificates/SUV-ABCD1234');
  await expect(page.getByText('Valid certificate')).toBeVisible();
  await expectNoA11yViolations(page);
});
