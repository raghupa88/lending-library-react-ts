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
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_LOANS,
  MOCK_BOOK_CREATED,
  MOCK_NOTIFICATIONS,
  MOCK_UNREAD_COUNT,
  MOCK_NOTIFICATION_MARKED_READ,
  MOCK_COURSES,
  MOCK_COURSE_DETAIL,
  MOCK_ENROLLMENTS_EMPTY,
  MOCK_ENROLLMENT_CREATED,
  MOCK_COURSE_PROGRESS_EMPTY,
  MOCK_COURSE_PROGRESS_PARTIAL,
  MOCK_ADMIN_COURSES,
  MOCK_COURSE_CREATED,
  MOCK_MODULE_CREATED,
  MOCK_LESSON_CREATED,
  MOCK_TESTS,
  MOCK_TEST_FOR_LEARNER,
  MOCK_ATTEMPT_START,
  MOCK_ATTEMPT_RESULT_PASS,
  MOCK_CERTIFICATES,
  MOCK_CERTIFICATE_VERIFY,
  MOCK_ADMIN_TESTS,
  MOCK_ADMIN_TEST_DETAIL,
  MOCK_TEST_CREATED,
  MOCK_QUESTION_CREATED,
  MOCK_VENUES,
  MOCK_VENUE_CREATED,
  MOCK_BATCHES_FOR_LEARNER,
  MOCK_BOOKING_CONFIRMED,
  MOCK_MY_BOOKINGS_EMPTY,
  MOCK_CANCEL_BOOKING_SUCCESS,
  MOCK_ADMIN_BATCHES,
  MOCK_ADMIN_BATCH_CREATED,
  MOCK_ADMIN_BATCH_PUBLISHED,
  MOCK_ADMIN_BATCH_DETAIL,
  MOCK_ATTENDANCE_MARKED,
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

export async function setupAdminApiMocks(
  page: Page,
  {
    users = MOCK_ADMIN_USERS,
    loans = MOCK_ADMIN_LOANS,
    bookSaved = MOCK_BOOK_CREATED,
  }: { users?: unknown; loans?: unknown; bookSaved?: unknown } = {},
) {
  await page.route(`${API_BASE}/admin/users`, (route) => route.fulfill(fulfill(users)));
  await page.route(`${API_BASE}/admin/loans*`, (route) => route.fulfill(fulfill(loans)));
  await page.route(`${API_BASE}/admin/books`, (route) => route.fulfill(fulfill(bookSaved)));
  await page.route(`${API_BASE}/admin/books/*`, (route) => route.fulfill(fulfill(bookSaved)));
}

export async function setupNotificationsApiMock(
  page: Page,
  {
    list = MOCK_NOTIFICATIONS,
    unreadCount = MOCK_UNREAD_COUNT,
    markRead = MOCK_NOTIFICATION_MARKED_READ,
  }: { list?: unknown; unreadCount?: unknown; markRead?: unknown } = {},
) {
  await page.route(`${API_BASE}/notifications/unread-count`, (route) =>
    route.fulfill(fulfill(unreadCount)),
  );
  await page.route(`${API_BASE}/notifications/*/read`, (route) =>
    route.fulfill(fulfill(markRead)),
  );
  await page.route(`${API_BASE}/notifications`, (route) => route.fulfill(fulfill(list)));
}

export async function setupLearnApiMocks(
  page: Page,
  {
    courses = MOCK_COURSES,
    detail = MOCK_COURSE_DETAIL,
    enrollments = MOCK_ENROLLMENTS_EMPTY,
    enroll = MOCK_ENROLLMENT_CREATED,
    progress = MOCK_COURSE_PROGRESS_EMPTY,
    complete = MOCK_COURSE_PROGRESS_PARTIAL,
  }: {
    courses?: unknown;
    detail?: unknown;
    enrollments?: unknown;
    enroll?: unknown;
    progress?: unknown;
    complete?: unknown;
  } = {},
) {
  await page.route(`${API_BASE}/learn/courses?*`, (route) => route.fulfill(fulfill(courses)));
  await page.route(`${API_BASE}/learn/courses`, (route) => route.fulfill(fulfill(courses)));
  await page.route(`${API_BASE}/learn/courses/*/enroll`, (route) =>
    route.fulfill(fulfill(enroll)),
  );
  await page.route(`${API_BASE}/learn/courses/*/progress`, (route) =>
    route.fulfill(fulfill(progress)),
  );
  await page.route(`${API_BASE}/learn/lessons/*/complete`, (route) =>
    route.fulfill(fulfill(complete)),
  );
  await page.route(`${API_BASE}/learn/courses/*`, (route) => route.fulfill(fulfill(detail)));
  await page.route(`${API_BASE}/learn/me/enrollments`, (route) =>
    route.fulfill(fulfill(enrollments)),
  );
}

export async function setupTestsApiMocks(
  page: Page,
  {
    tests = MOCK_TESTS,
    detail = MOCK_TEST_FOR_LEARNER,
    start = MOCK_ATTEMPT_START,
    submit = MOCK_ATTEMPT_RESULT_PASS,
    certificates = MOCK_CERTIFICATES,
    verify = MOCK_CERTIFICATE_VERIFY,
  }: {
    tests?: unknown;
    detail?: unknown;
    start?: unknown;
    submit?: unknown;
    certificates?: unknown;
    verify?: unknown;
  } = {},
) {
  await page.route(`${API_BASE}/learn/courses/*/tests`, (route) => route.fulfill(fulfill(tests)));
  await page.route(`${API_BASE}/learn/tests/*/attempts`, (route) => route.fulfill(fulfill(start)));
  await page.route(`${API_BASE}/learn/tests/*`, (route) => route.fulfill(fulfill(detail)));
  await page.route(`${API_BASE}/learn/attempts/*/submit`, (route) => route.fulfill(fulfill(submit)));
  await page.route(`${API_BASE}/learn/me/certificates`, (route) => route.fulfill(fulfill(certificates)));
  await page.route(`${API_BASE}/learn/certificates/*`, (route) => route.fulfill(fulfill(verify)));
}

export async function setupAdminTestsApiMocks(
  page: Page,
  {
    tests = MOCK_ADMIN_TESTS,
    detail = MOCK_ADMIN_TEST_DETAIL,
    testSaved = MOCK_TEST_CREATED,
    questionSaved = MOCK_QUESTION_CREATED,
  }: { tests?: unknown; detail?: unknown; testSaved?: unknown; questionSaved?: unknown } = {},
) {
  // Mutable so an appended question shows up on the detail refetch, mirroring
  // the real (append-only) backend — same pattern as setupAdminLearnApiMocks.
  const detailState = JSON.parse(JSON.stringify(detail)) as { data: { questions: unknown[] } };

  await page.route(`${API_BASE}/admin/learn/courses/*/tests`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'POST' ? testSaved : tests)),
  );
  await page.route(`${API_BASE}/admin/learn/tests/*/questions`, (route) => {
    const newQuestion = (questionSaved as { data: unknown }).data;
    detailState.data.questions.push(newQuestion);
    route.fulfill(fulfill({ success: true, data: newQuestion }));
  });
  await page.route(`${API_BASE}/admin/learn/tests/*`, (route) => route.fulfill(fulfill(detailState)));
}

export async function setupAdminLearnApiMocks(
  page: Page,
  {
    courses = MOCK_ADMIN_COURSES,
    detail = MOCK_COURSE_DETAIL,
    courseSaved = MOCK_COURSE_CREATED,
    moduleSaved = MOCK_MODULE_CREATED,
    lessonSaved = MOCK_LESSON_CREATED,
  }: {
    courses?: unknown;
    detail?: unknown;
    courseSaved?: unknown;
    moduleSaved?: unknown;
    lessonSaved?: unknown;
  } = {},
) {
  // Mutable so appended modules/lessons show up on the detail refetch that
  // follows each mutation, mirroring the real (append-only) backend.
  const detailState = JSON.parse(JSON.stringify(detail)) as {
    data: { modules: { id: string; lessons: unknown[] }[] };
  };

  await page.route(`${API_BASE}/admin/learn/courses`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'POST' ? courseSaved : courses)),
  );
  await page.route(`${API_BASE}/admin/learn/courses/*/modules`, (route) => {
    const newModule = {
      ...(moduleSaved as { data: { id: string } }).data,
      lessons: [] as unknown[],
    };
    detailState.data.modules.push(newModule);
    route.fulfill(fulfill({ success: true, data: newModule }));
  });
  await page.route(`${API_BASE}/admin/learn/modules/*/lessons`, (route) => {
    const moduleId = route.request().url().split('/modules/')[1]?.split('/lessons')[0];
    const targetModule =
      detailState.data.modules.find((m) => m.id === moduleId) ?? detailState.data.modules[0];
    const newLesson = (lessonSaved as { data: unknown }).data;
    targetModule.lessons.push(newLesson);
    route.fulfill(fulfill({ success: true, data: newLesson }));
  });
  await page.route(`${API_BASE}/admin/learn/courses/*/publish`, (route) =>
    route.fulfill(fulfill(courseSaved)),
  );
  await page.route(`${API_BASE}/admin/learn/courses/*/unpublish`, (route) =>
    route.fulfill(fulfill(courseSaved)),
  );
  await page.route(`${API_BASE}/admin/learn/courses/*`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'GET' ? detailState : courseSaved)),
  );
}

export async function setupBatchesApiMocks(
  page: Page,
  {
    batches = MOCK_BATCHES_FOR_LEARNER,
    book = MOCK_BOOKING_CONFIRMED,
    myBookings = MOCK_MY_BOOKINGS_EMPTY,
    cancel = MOCK_CANCEL_BOOKING_SUCCESS,
  }: { batches?: unknown; book?: unknown; myBookings?: unknown; cancel?: unknown } = {},
) {
  await page.route(`${API_BASE}/learn/batches/*/book`, (route) => route.fulfill(fulfill(book)));
  await page.route(`${API_BASE}/learn/bookings/*`, (route) => route.fulfill(fulfill(cancel)));
  await page.route(`${API_BASE}/learn/me/bookings`, (route) => route.fulfill(fulfill(myBookings)));
  await page.route(`${API_BASE}/learn/courses/*/batches`, (route) => route.fulfill(fulfill(batches)));
}

export async function setupAdminBatchesApiMocks(
  page: Page,
  {
    venues = MOCK_VENUES,
    venueSaved = MOCK_VENUE_CREATED,
    batches = MOCK_ADMIN_BATCHES,
    batchSaved = MOCK_ADMIN_BATCH_CREATED,
    batchPublished = MOCK_ADMIN_BATCH_PUBLISHED,
    detail = MOCK_ADMIN_BATCH_DETAIL,
    attendanceMarked = MOCK_ATTENDANCE_MARKED,
  }: {
    venues?: unknown;
    venueSaved?: unknown;
    batches?: unknown;
    batchSaved?: unknown;
    batchPublished?: unknown;
    detail?: unknown;
    attendanceMarked?: unknown;
  } = {},
) {
  await page.route(`${API_BASE}/admin/learn/venues`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'POST' ? venueSaved : venues)),
  );
  await page.route(`${API_BASE}/admin/learn/venues/*`, (route) => route.fulfill(fulfill(venueSaved)));
  await page.route(`${API_BASE}/admin/learn/courses/*/batches`, (route) =>
    route.fulfill(fulfill(route.request().method() === 'POST' ? batchSaved : batches)),
  );
  await page.route(`${API_BASE}/admin/learn/batches/*/publish`, (route) =>
    route.fulfill(fulfill(batchPublished)),
  );
  await page.route(`${API_BASE}/admin/learn/batches/*/cancel`, (route) =>
    route.fulfill(fulfill(batchPublished)),
  );
  await page.route(`${API_BASE}/admin/learn/sessions/*/attendance`, (route) =>
    route.fulfill(fulfill(attendanceMarked)),
  );
  await page.route(`${API_BASE}/admin/learn/batches/*`, (route) => route.fulfill(fulfill(detail)));
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
  await setupNotificationsApiMock(page);
  await setupLearnApiMocks(page);
  await setupTestsApiMocks(page);
  await setupBatchesApiMocks(page);
}
