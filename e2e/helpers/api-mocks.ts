import { Page } from '@playwright/test';
import {
  MOCK_BOOKS,
  MOCK_BOOK_DETAIL,
  MOCK_LOGIN_SUCCESS,
  MOCK_REGISTER_SUCCESS,
  MOCK_LOGOUT_SUCCESS,
  MOCK_LOANS,
  MOCK_BORROW_SUCCESS,
  MOCK_RETURN_SUCCESS,
  MOCK_PLANS,
  MOCK_SUBSCRIPTION_BASIC,
  MOCK_SUBSCRIBE_STANDARD_SUCCESS,
  MOCK_PROFILE,
  MOCK_PROFILE_UPDATED,
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

export async function setupLoansApiMock(
  page: Page,
  {
    list = MOCK_LOANS,
    borrow = MOCK_BORROW_SUCCESS,
    returned = MOCK_RETURN_SUCCESS,
  }: { list?: unknown; borrow?: unknown; returned?: unknown } = {},
) {
  await page.route(`${API_BASE}/loans/*/return`, (route) =>
    route.fulfill(fulfill(returned)),
  );
  await page.route(`${API_BASE}/loans`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'POST' ? borrow : list)),
  );
}

export async function setupSubscriptionsApiMock(
  page: Page,
  {
    plans = MOCK_PLANS,
    current = MOCK_SUBSCRIPTION_BASIC,
    subscribe = MOCK_SUBSCRIBE_STANDARD_SUCCESS,
  }: { plans?: unknown; current?: unknown; subscribe?: unknown } = {},
) {
  await page.route(`${API_BASE}/subscriptions/plans`, (route) =>
    route.fulfill(fulfill(plans)),
  );
  await page.route(`${API_BASE}/subscriptions/current`, (route) =>
    route.fulfill(fulfill(current)),
  );
  await page.route(`${API_BASE}/subscriptions`, (route) =>
    route.fulfill(fulfill(subscribe)),
  );
}

export async function setupProfileApiMock(
  page: Page,
  { profile = MOCK_PROFILE, updated = MOCK_PROFILE_UPDATED }: { profile?: unknown; updated?: unknown } = {},
) {
  await page.route(`${API_BASE}/users/*`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'PUT' ? updated : profile)),
  );
}

export async function setupAllApiMocks(page: Page) {
  await setupBookDetailApiMock(page);
  await setupBooksApiMock(page);
  await setupLoginApiMock(page);
  await setupRegisterApiMock(page);
  await setupLogoutApiMock(page);
  await setupLoansApiMock(page);
  await setupSubscriptionsApiMock(page);
  await setupProfileApiMock(page);
}
