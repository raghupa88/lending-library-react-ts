import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import {
  setupAllApiMocks,
  setupNotificationsApiMock,
} from '../helpers/api-mocks';
import { MOCK_NOTIFICATIONS_EMPTY, MOCK_UNREAD_COUNT_ZERO } from '../fixtures/mock-data';
import { expectNoA11yViolations } from '../helpers/axe';

authTest('bell shows the unread badge count', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await authExpect(
    page.getByRole('button', { name: /notifications, 1 unread/i }),
  ).toBeVisible();
});

authTest('bell has no badge when there are no unread notifications', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await setupNotificationsApiMock(page, { unreadCount: MOCK_UNREAD_COUNT_ZERO });
  await page.goto('/');
  await authExpect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
});

authTest('opening the bell shows the notification feed', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: /notifications/i }).click();
  const menu = page.getByRole('region', { name: 'Notifications feed' });
  await authExpect(menu.getByText('You borrowed "The Great Gatsby"')).toBeVisible();
  await authExpect(menu.getByText(/premium plan/i)).toBeVisible();
  await authExpect(menu.getByText('New')).toBeVisible();
});

authTest('empty feed shows the empty state', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await setupNotificationsApiMock(page, {
    list: MOCK_NOTIFICATIONS_EMPTY,
    unreadCount: MOCK_UNREAD_COUNT_ZERO,
  });
  await page.goto('/');
  await page.getByRole('button', { name: /notifications/i }).click();
  await authExpect(page.getByText('No notifications yet')).toBeVisible();
});

authTest('clicking an unread notification marks it read', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/');

  const putRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/notifications/') && req.method() === 'PUT') putRequests.push(req.url());
  });

  await page.getByRole('button', { name: /notifications/i }).click();
  await page.getByRole('button', { name: /you borrowed/i }).click();
  await authExpect.poll(() => putRequests.length).toBeGreaterThan(0);
});

authTest('escape closes the dropdown', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: /notifications/i }).click();
  await authExpect(page.getByRole('region', { name: 'Notifications feed' })).toBeVisible();
  await page.keyboard.press('Escape');
  await authExpect(page.getByRole('region', { name: 'Notifications feed' })).toBeHidden();
});

authTest('outside click closes the dropdown', async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: /notifications/i }).click();
  await authExpect(page.getByRole('region', { name: 'Notifications feed' })).toBeVisible();
  await page.mouse.click(20, 400);
  await authExpect(page.getByRole('region', { name: 'Notifications feed' })).toBeHidden();
});

authTest('notification dropdown has no WCAG A/AA violations', async ({
  authenticatedPage: page,
}) => {
  await setupAllApiMocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: /notifications/i }).click();
  await authExpect(page.getByRole('region', { name: 'Notifications feed' })).toBeVisible();
  await expectNoA11yViolations(page);
});
