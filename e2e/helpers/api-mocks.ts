import { Page } from '@playwright/test';
import {
  MOCK_BOOKS,
  MOCK_BOOK_DETAIL,
  MOCK_LOGIN_SUCCESS,
  MOCK_REGISTER_SUCCESS,
  MOCK_LOGOUT_SUCCESS,
} from '../fixtures/mock-data';

const API_BASE = 'http://localhost:8080/api/v1';

function fulfill(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

export async function setupBooksApiMock(page: Page, response: unknown = MOCK_BOOKS) {
  await page.route(`${API_BASE}/books?*`, (route) => route.fulfill(fulfill(response)));
  await page.route(`${API_BASE}/books`, (route) => route.fulfill(fulfill(response)));
}

export async function setupBookDetailApiMock(
  page: Page,
  response: unknown = MOCK_BOOK_DETAIL,
) {
  await page.route(`${API_BASE}/books/*`, (route) => route.fulfill(fulfill(response)));
}

export async function setupLoginApiMock(page: Page, response: unknown = MOCK_LOGIN_SUCCESS) {
  await page.route(`${API_BASE}/auth/login`, (route) => route.fulfill(fulfill(response)));
}

export async function setupRegisterApiMock(
  page: Page,
  response: unknown = MOCK_REGISTER_SUCCESS,
) {
  await page.route(`${API_BASE}/auth/register`, (route) => route.fulfill(fulfill(response)));
}

export async function setupLogoutApiMock(page: Page) {
  await page.route(`${API_BASE}/auth/logout`, (route) =>
    route.fulfill(fulfill(MOCK_LOGOUT_SUCCESS)),
  );
}

export async function setupAllApiMocks(page: Page) {
  await setupBookDetailApiMock(page);
  await setupBooksApiMock(page);
  await setupLoginApiMock(page);
  await setupRegisterApiMock(page);
  await setupLogoutApiMock(page);
}
