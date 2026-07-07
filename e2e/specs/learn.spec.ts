import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupLearnApiMocks } from '../helpers/api-mocks';
import {
  MOCK_COURSES_EMPTY,
  MOCK_ENROLLMENTS,
  MOCK_ENROLLMENTS_IN_PROGRESS,
  MOCK_ENROLLMENTS_COMPLETE,
  MOCK_ENROLL_ALREADY_FAILURE,
  MOCK_COURSE_PROGRESS_EMPTY,
  MOCK_COURSE_PROGRESS_PARTIAL,
  MOCK_COURSE_PROGRESS_COMPLETE,
  MOCK_PROGRESS_NOT_ENROLLED_FAILURE,
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

authTest('already-enrolled course shows Continue learning instead of Enroll', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS,
    progress: MOCK_COURSE_PROGRESS_EMPTY,
  });
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByRole('button', { name: /enroll for free/i })).toHaveCount(0);
  const continueLink = page.getByRole('link', { name: /continue learning/i });
  await authExpect(continueLink).toBeVisible();
  await authExpect(continueLink).toHaveAttribute('href', '/learn/money-foundations/lesson/lesson-1');
});

authTest('a fully-completed course shows Review course instead of Continue', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS_COMPLETE,
    progress: MOCK_COURSE_PROGRESS_COMPLETE,
  });
  await page.goto('/learn/money-foundations');
  await authExpect(page.getByRole('link', { name: /review course/i })).toBeVisible();
});

authTest('syllabus shows checkmarks for completed lessons when enrolled', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS_IN_PROGRESS,
    progress: MOCK_COURSE_PROGRESS_PARTIAL,
  });
  await page.goto('/learn/money-foundations');
  const lessonLink = page.getByRole('link', { name: /saving vs\. investing/i });
  await authExpect(lessonLink.locator('svg.lucide-circle-check-big, svg[class*="check"]')).toBeVisible();
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
    page.getByRole('link', { name: 'Money Foundations', exact: true }),
  ).toBeVisible();
});

test('unauthenticated access to the lesson player redirects to login', async ({ page }) => {
  await page.goto('/learn/money-foundations/lesson/lesson-1');
  await expect(page).toHaveURL(/\/login/);
});

authTest('lesson player renders content and outline for an enrolled learner', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS,
    progress: MOCK_COURSE_PROGRESS_EMPTY,
  });
  await page.goto('/learn/money-foundations/lesson/lesson-1');
  await authExpect(page.getByRole('heading', { level: 1, name: 'Saving vs. investing' })).toBeVisible();
  await authExpect(page.getByText('Saving protects money; investing grows it.')).toBeVisible();
  await authExpect(page.getByRole('navigation', { name: 'Lesson outline' })).toBeVisible();
  await authExpect(page.getByRole('progressbar', { name: 'Course progress' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});

authTest('a non-enrolled learner is blocked from the lesson player', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { progress: MOCK_PROGRESS_NOT_ENROLLED_FAILURE });
  await page.goto('/learn/money-foundations/lesson/lesson-1');
  await authExpect(page.getByRole('heading', { name: 'Enroll to unlock this lesson' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to course' }).click();
  await authExpect(page).toHaveURL('/learn/money-foundations');
});

authTest('marking a lesson complete advances to the next lesson', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS,
    progress: MOCK_COURSE_PROGRESS_EMPTY,
    complete: MOCK_COURSE_PROGRESS_PARTIAL,
  });
  await page.goto('/learn/money-foundations/lesson/lesson-1');
  await page.getByRole('button', { name: /mark complete/i }).click();
  await authExpect(page).toHaveURL('/learn/money-foundations/lesson/lesson-2');
  await authExpect(page.getByRole('heading', { level: 1, name: 'The magic of compounding' })).toBeVisible();
});

authTest('completing the final lesson returns to the course page', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS,
    progress: MOCK_COURSE_PROGRESS_PARTIAL,
    complete: MOCK_COURSE_PROGRESS_COMPLETE,
  });
  await page.goto('/learn/money-foundations/lesson/lesson-3');
  await page.getByRole('button', { name: /mark complete/i }).click();
  await authExpect(page).toHaveURL('/learn/money-foundations');
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/course complete/i),
  ).toBeVisible();
});

authTest('an already-completed lesson shows Next lesson instead of Mark complete', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS_IN_PROGRESS,
    progress: MOCK_COURSE_PROGRESS_PARTIAL,
  });
  await page.goto('/learn/money-foundations/lesson/lesson-1');
  await authExpect(page.getByRole('button', { name: /mark complete/i })).toHaveCount(0);
  await authExpect(page.getByRole('button', { name: /next lesson/i })).toBeEnabled();
});

authTest("dashboard My learning tab shows a Continue link to the next lesson", async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, { enrollments: MOCK_ENROLLMENTS_IN_PROGRESS });
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /my learning/i }).click();
  const continueLink = page.getByRole('link', { name: 'Continue' });
  await authExpect(continueLink).toHaveAttribute('href', '/learn/money-foundations/lesson/lesson-2');
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

authTest('lesson player has no WCAG A/AA violations in both themes', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupLearnApiMocks(page, {
    enrollments: MOCK_ENROLLMENTS,
    progress: MOCK_COURSE_PROGRESS_EMPTY,
  });
  await page.goto('/learn/money-foundations/lesson/lesson-1');
  await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: /switch to dark theme/i }).click();
  await authExpect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoA11yViolations(page);
});
