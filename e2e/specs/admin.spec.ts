import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupBooksApiMock,
  setupAdminApiMocks,
  setupAdminLearnApiMocks,
} from '../helpers/api-mocks';
import { MOCK_ADMIN_LOANS_OVERDUE } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

test('unauthenticated /admin redirects to login', async ({ page }) => {
  await setupBooksApiMock(page);
  await page.goto('/admin');
  await expect(page).toHaveURL('/login?returnTo=%2Fadmin');
});

authTest('member role is bounced from /admin to member dashboard', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/admin');
  await authExpect(page).toHaveURL('/dashboard');
});

authTest('admin overview shows stat cards and recent activity', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminApiMocks(page);
  await page.goto('/admin');
  await authExpect(page.getByRole('heading', { name: 'Library overview' })).toBeVisible();
  // Stat cards render value+label as one text node: 2 loans out, 1 overdue,
  // 2 members, 3 titles (from the books mock totalElements)
  await authExpect(page.getByText('3Titles in catalog')).toBeVisible();
  await authExpect(page.getByText('2Copies out now')).toBeVisible();
  await authExpect(page.getByText('1Overdue')).toBeVisible();
  await authExpect(page.getByText('2Members')).toBeVisible();
  await authExpect(page.getByText('Recent loan activity')).toBeVisible();
});

authTest('admin nav link appears in the member navbar for admins', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await authExpect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin', exact: true }),
  ).toBeVisible();
});

authTest('books admin lists catalog and opens the add-book dialog', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupAdminApiMocks(page);
  await page.goto('/admin/books');
  await authExpect(
    page.getByRole('cell', { name: 'The Great Gatsby', exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add book' }).click();
  const dialog = page.getByRole('dialog');
  await authExpect(dialog.getByLabel('Title')).toBeVisible();

  const posts: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/admin/books') && req.method() === 'POST')
      posts.push(req.postData() ?? '');
  });

  await dialog.getByLabel('Title').fill('New Book');
  await dialog.getByLabel('Author').fill('Fresh Author');
  await dialog.getByLabel('ISBN').fill('978-1-234-56789-0');
  await dialog.getByLabel('Category').fill('Fiction');
  await dialog.getByLabel('Language').fill('English');
  await dialog.getByRole('button', { name: 'Add book' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/added "new book"/i),
  ).toBeVisible();
  expect(posts.length).toBeGreaterThan(0);
  expect(posts[0]).toContain('"title":"New Book"');
});

authTest('edit dialog is prefilled from the row', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminApiMocks(page);
  await page.goto('/admin/books');
  await page.getByRole('button', { name: /edit the great gatsby/i }).click();
  await authExpect(page.getByRole('dialog').getByLabel('Title')).toHaveValue('The Great Gatsby');
});

authTest('courses admin lists courses and opens the add-course dialog', async ({
  adminPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupAdminLearnApiMocks(page);
  await page.goto('/admin/learn/courses');
  await authExpect(
    page.getByRole('cell', { name: 'Money Foundations', exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add course' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a course' });
  await authExpect(dialog.getByLabel('Title')).toBeVisible();

  const posts: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/admin/learn/courses') && req.method() === 'POST')
      posts.push(req.postData() ?? '');
  });

  await dialog.getByLabel('Title').fill('New Course');
  await dialog.getByLabel('Slug').fill('new-course');
  await dialog.getByLabel('Summary').fill('A brand new course.');
  await dialog.getByRole('button', { name: 'Add course' }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/added "new course"/i),
  ).toBeVisible();
  expect(posts.length).toBeGreaterThan(0);
  expect(posts[0]).toContain('"title":"New Course"');
});

authTest('publish toggles a draft course to published', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminLearnApiMocks(page);
  await page.goto('/admin/learn/courses');
  const row = page.getByRole('row', { name: /equities 101/i });
  await row.getByRole('button', { name: /^publish equities 101$/i }).click();
  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/published/i),
  ).toBeVisible();
});

authTest('syllabus dialog adds a module and a lesson', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminLearnApiMocks(page);
  await page.goto('/admin/learn/courses');
  await page
    .getByRole('row', { name: /money foundations/i })
    .getByRole('button', { name: /manage syllabus/i })
    .click();

  const dialog = page.getByRole('dialog', { name: /syllabus/i });
  await authExpect(dialog.getByText('Why bother investing?')).toBeVisible();

  await dialog.getByLabel('New module title').fill('Reading a balance sheet');
  await dialog.getByRole('button', { name: 'Add module' }).click();
  await authExpect(dialog.getByText('New Module')).toBeVisible();

  await dialog.getByRole('button', { name: 'Add lesson' }).first().click();
  await dialog.getByLabel('Lesson title').fill('Intro to balance sheets');
  await dialog.locator('button[type="submit"]').filter({ hasText: 'Add lesson' }).click();
  await authExpect(dialog.getByText('New Lesson')).toBeVisible();
});

authTest('members admin lists users with plan and loan counts', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminApiMocks(page);
  await page.goto('/admin/members');
  const memberRow = page.getByRole('row', { name: /test member/i });
  await authExpect(memberRow.getByText('member@example.com')).toBeVisible();
  await authExpect(memberRow.getByText('basic')).toBeVisible();
  await authExpect(
    page.getByRole('row', { name: /admin user/i }).getByText('Admin', { exact: true }),
  ).toBeVisible();
});

authTest('loans admin filters by overdue and highlights rows', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminApiMocks(page);
  await page.goto('/admin/loans');
  await authExpect(page.getByRole('cell', { name: 'The Great Gatsby' })).toBeVisible();

  await setupAdminApiMocks(page, { loans: MOCK_ADMIN_LOANS_OVERDUE });
  await page.getByRole('button', { name: 'Overdue' }).click();
  await authExpect(page.getByRole('cell', { name: 'Ponniyin Selvan' })).toBeVisible();
  await authExpect(page.getByRole('cell', { name: 'The Great Gatsby' })).toHaveCount(0);
});

authTest('admin pages have no WCAG A/AA violations', async ({ adminPage: page }) => {
  await setupAllApiMocks(page);
  await setupAdminApiMocks(page);
  await setupAdminLearnApiMocks(page);
  for (const path of ['/admin', '/admin/books', '/admin/learn/courses', '/admin/members', '/admin/loans']) {
    await page.goto(path);
    await authExpect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  }
});
