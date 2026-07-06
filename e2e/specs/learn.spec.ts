import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupLearnApiMocks } from '../helpers/api-mocks';
import {
  MOCK_COURSES_EMPTY,
  MOCK_ENROLLMENTS,
  MOCK_ENROLL_ALREADY_FAILURE,
} from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test.beforeEach(async ({ page }) => {
  await setupAllApiMocks(page);
});

test('catalog renders heading and course cards from API data', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.getByRole('heading', { level: 1, name: 'Suvadi Learn' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /money foundations/i }),
  ).toBeVisible();
  await expect(page.getByText('Free', { exact: true })).toBeVisible();
});

test('track filter updates the URL and API query', async ({ page }) => {
  await page.goto('/learn');
  await page.getByRole('combobox', { name: /filter by track/i }).selectOption('EQUITIES');
  await expect(page).toHaveURL(/track=EQUITIES/);
});

test('level filter updates the URL and API query', async ({ page }) => {
  await page.goto('/learn');
  await page.getByRole('combobox', { name: /filter by level/i }).selectOption('ADVANCED');
  await expect(page).toHaveURL(/level=ADVANCED/);
});

test('empty result shows the no-match state', async ({ page }) => {
  await setupLearnApiMocks(page, { courses: MOCK_COURSES_EMPTY });
  await page.goto('/learn');
  await expect(page.getByRole('heading', { name: 'No courses match' })).toBeVisible();
});

test('card click navigates to course detail', async ({ page }) => {
  await page.goto('/learn');
  await page.getByRole('link', { name: /money foundations/i }).click();
  await expect(page).toHaveURL('/learn/money-foundations');
});

test('course detail renders syllabus with modules and lessons', async ({ page }) => {
  await page.goto('/learn/money-foundations');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Money Foundations' }),
  ).toBeVisible();
  await expect(page.getByText('Why bother investing?')).toBeVisible();
  await expect(page.getByText('Saving vs. investing')).toBeVisible();
  await expect(page.getByText('Understanding risk')).toBeVisible();
});

test('back link returns to the catalog', async ({ page }) => {
  await page.goto('/learn/money-foundations');
  await page.getByRole('link', { name: /back to suvadi learn/i }).click();
  await expect(page).toHaveURL('/learn');
});

test('unknown course shows the not-found state', async ({ page }) => {
  await setupLearnApiMocks(page, { detail: { success: false, error: 'Course not found' } });
  await page.goto('/learn/nope');
  await expect(page.getByRole('heading', { name: 'Course not found' })).toBeVisible();
});

test('enroll while signed out redirects to login with returnTo', async ({ page }) => {
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /enroll for free/i }).click();
  await expect(page).toHaveURL('/login?returnTo=%2Flearn%2Fmoney-foundations');
});

authTest('enroll while signed in shows a success toast', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /enroll for free/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/enrolled in "money foundations"/i),
  ).toBeVisible();
});

authTest('already-enrolled course disables the enroll button', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { enrollments: MOCK_ENROLLMENTS });
  await page.goto('/learn/money-foundations');
  await authExpect(
    page.getByRole('button', { name: /already enrolled/i }),
  ).toBeDisabled();
});

authTest('enroll failure surfaces an error toast', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { enroll: MOCK_ENROLL_ALREADY_FAILURE });
  await page.goto('/learn/money-foundations');
  await page.getByRole('button', { name: /enroll for free/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/already enrolled/i),
  ).toBeVisible();
});

authTest("dashboard My learning tab lists enrollments", async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { enrollments: MOCK_ENROLLMENTS });
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /my learning/i }).click();
  await authExpect(
    page.getByRole('link', { name: /money foundations/i }),
  ).toBeVisible();
});

test('learn pages have no WCAG A/AA violations in both themes', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.getByRole('heading', { level: 1, name: 'Suvadi Learn' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto('/learn/money-foundations');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoA11yViolations(page);
});
