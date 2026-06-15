import { test as base, Page } from '@playwright/test';
import { MOCK_USER_STORAGE } from './mock-data';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Inject auth state into localStorage before the page loads so AuthContext
    // picks it up in its initial useEffect and skips the loading spinner.
    await page.addInitScript((user) => {
      localStorage.setItem('access_token', 'test-access-token-123');
      localStorage.setItem('refresh_token', 'test-refresh-token-123');
      localStorage.setItem('user', JSON.stringify(user));
    }, MOCK_USER_STORAGE);
    await use(page);
  },
});

export { expect } from '@playwright/test';
