import { test as base, Page } from '@playwright/test';
import {
  MOCK_USER_STORAGE,
  MOCK_REFRESH_SUCCESS,
  MOCK_REFRESH_ADMIN_SUCCESS,
} from './mock-data';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

/**
 * Cookie-mode auth: the app keeps the access token in memory and restores
 * sessions by calling POST /auth/refresh on boot. Fixtures therefore seed
 * the cached user (instant paint) and mock the refresh endpoint — no tokens
 * ever touch localStorage.
 */
async function seedSession(page: Page, user: object, refreshResponse: unknown) {
  await page.route('http://localhost:8080/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(refreshResponse),
    }),
  );
  await page.addInitScript((u) => {
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await seedSession(page, MOCK_USER_STORAGE, MOCK_REFRESH_SUCCESS);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await seedSession(
      page,
      { ...MOCK_USER_STORAGE, id: 'admin-1', name: 'Admin User', role: 'admin' },
      MOCK_REFRESH_ADMIN_SUCCESS,
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
