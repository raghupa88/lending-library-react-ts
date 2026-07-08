// Raw API auth response shape — mirrors backend AuthResponse.java (userId, not
// id). Web clients get refreshToken: null — it travels in the httpOnly cookie.
export const MOCK_USER = {
  userId: 'user-1',
  email: 'member@example.com',
  name: 'Test Member',
  role: 'member',
  plan: 'basic',
  accessToken: 'test-access-token-123',
  refreshToken: null,
};

export const MOCK_ADMIN_AUTH = {
  ...MOCK_USER,
  userId: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
};

// Silent-refresh responses (POST /auth/refresh) used to restore sessions
export const MOCK_REFRESH_SUCCESS = { success: true, data: MOCK_USER };
export const MOCK_REFRESH_ADMIN_SUCCESS = { success: true, data: MOCK_ADMIN_AUTH };
export const MOCK_REFRESH_FAILURE = { success: false, error: 'Invalid refresh token' };

// Mapped user shape stored in localStorage under "user" key
// This mirrors what AuthContext.mapAuthResponseToUser() + login() writes
export const MOCK_USER_STORAGE = {
  id: 'user-1',
  name: 'Test Member',
  email: 'member@example.com',
  role: 'member',
  plan: 'basic',
  joinDate: '2024-01-15T00:00:00.000Z',
  booksRead: 5,
  currentBooks: [],
};

// Book items mirror backend BookResponse.java (cover, availableCopies, ...)
export const MOCK_BOOK_ITEMS = [
  {
    id: 'book-1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    description: 'A classic American novel.',
    totalCopies: 3,
    availableCopies: 2,
    available: true,
    category: 'Fiction',
    genre: 'Fiction',
    language: 'English',
    pageCount: 180,
    rating: 4.5,
    cover: null,
    publishedYear: 1925,
  },
  {
    id: 'book-2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0-06-112008-4',
    description: 'A powerful story of racial injustice.',
    totalCopies: 2,
    availableCopies: 0,
    available: false,
    category: 'Fiction',
    genre: 'Fiction',
    language: 'English',
    pageCount: 281,
    rating: 4.8,
    cover: null,
    publishedYear: 1960,
  },
  {
    id: 'book-3',
    title: 'Ponniyin Selvan',
    author: 'Kalki Krishnamurthy',
    isbn: '978-81-234-0001-1',
    description: 'An epic historical novel.',
    totalCopies: 5,
    availableCopies: 5,
    available: true,
    category: 'Historical Fiction',
    genre: 'Historical Fiction',
    language: 'Tamil',
    pageCount: 2400,
    rating: 4.9,
    cover: null,
    publishedYear: 1955,
  },
];

export const MOCK_BOOKS = {
  success: true,
  data: {
    content: MOCK_BOOK_ITEMS,
    totalPages: 1,
    totalElements: MOCK_BOOK_ITEMS.length,
    currentPage: 0,
    pageSize: 24,
    hasNext: false,
    hasPrev: false,
  },
};

export const MOCK_BOOKS_EMPTY = {
  success: true,
  data: {
    content: [],
    totalPages: 0,
    totalElements: 0,
    currentPage: 0,
    pageSize: 24,
    hasNext: false,
    hasPrev: false,
  },
};

export const MOCK_BOOK_DETAIL = {
  success: true,
  data: MOCK_BOOK_ITEMS[0],
};

export const MOCK_LOGIN_SUCCESS = {
  success: true,
  data: MOCK_USER,
};

export const MOCK_LOGIN_FAILURE = {
  success: false,
  error: 'Invalid credentials',
};

export const MOCK_REGISTER_SUCCESS = {
  success: true,
  data: {
    ...MOCK_USER,
    email: 'newuser@example.com',
    name: 'New User',
  },
};

export const MOCK_REGISTER_FAILURE = {
  success: false,
  error: 'Email already exists',
};

export const MOCK_LOGOUT_SUCCESS = {
  success: true,
  message: 'Logged out successfully',
};

// --- Loans (backend LoanResponse.java) ---

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export const MOCK_LOANS = {
  success: true,
  data: [
    {
      id: 'loan-1',
      bookId: 'book-1',
      bookTitle: 'The Great Gatsby',
      bookAuthor: 'F. Scott Fitzgerald',
      bookCover: null,
      borrowedAt: daysFromNow(-3),
      dueDate: daysFromNow(11),
      returnedAt: null,
      status: 'ACTIVE',
    },
    {
      id: 'loan-2',
      bookId: 'book-3',
      bookTitle: 'Ponniyin Selvan',
      bookAuthor: 'Kalki Krishnamurthy',
      bookCover: null,
      borrowedAt: daysFromNow(-13),
      dueDate: daysFromNow(1),
      returnedAt: null,
      status: 'ACTIVE',
    },
    {
      id: 'loan-3',
      bookId: 'book-2',
      bookTitle: 'To Kill a Mockingbird',
      bookAuthor: 'Harper Lee',
      bookCover: null,
      borrowedAt: daysFromNow(-40),
      dueDate: daysFromNow(-26),
      returnedAt: daysFromNow(-28),
      status: 'RETURNED',
    },
  ],
};

export const MOCK_LOANS_EMPTY = { success: true, data: [] };

export const MOCK_BORROW_SUCCESS = {
  success: true,
  data: {
    id: 'loan-new',
    bookId: 'book-1',
    bookTitle: 'The Great Gatsby',
    bookAuthor: 'F. Scott Fitzgerald',
    bookCover: null,
    borrowedAt: daysFromNow(0),
    dueDate: daysFromNow(14),
    returnedAt: null,
    status: 'ACTIVE',
  },
};

export const MOCK_BORROW_LIMIT_FAILURE = {
  success: false,
  error: 'Loan limit reached (2 books). Return a book to borrow more.',
};

export const MOCK_RETURN_SUCCESS = {
  success: true,
  data: { ...MOCK_LOANS.data[0], returnedAt: daysFromNow(0), status: 'RETURNED' },
};

// --- Reservations (backend ReservationResponse.java) — waitlist/hold for out-of-stock books ---

export const MOCK_RESERVATION_WAITING = {
  id: 'reservation-1',
  bookId: 'book-2',
  bookTitle: 'To Kill a Mockingbird',
  bookCover: null,
  status: 'WAITING',
  reservedAt: daysFromNow(-1),
  holdExpiresAt: null,
};

export const MOCK_RESERVATION_READY = {
  ...MOCK_RESERVATION_WAITING,
  id: 'reservation-2',
  status: 'READY_FOR_PICKUP',
  holdExpiresAt: daysFromNow(3),
};

export const MOCK_MY_RESERVATIONS_EMPTY = { success: true, data: [] };
export const MOCK_MY_RESERVATIONS_WAITING = { success: true, data: [MOCK_RESERVATION_WAITING] };
export const MOCK_MY_RESERVATIONS_READY = { success: true, data: [MOCK_RESERVATION_READY] };

export const MOCK_JOIN_WAITLIST_SUCCESS = { success: true, data: MOCK_RESERVATION_WAITING };
export const MOCK_CANCEL_RESERVATION_SUCCESS = { success: true, data: null };
export const MOCK_CLAIM_RESERVATION_SUCCESS = {
  success: true,
  data: {
    id: 'loan-claimed',
    bookId: 'book-2',
    bookTitle: 'To Kill a Mockingbird',
    bookAuthor: 'Harper Lee',
    bookCover: null,
    borrowedAt: daysFromNow(0),
    dueDate: daysFromNow(14),
    returnedAt: null,
    status: 'ACTIVE',
  },
};

// --- Subscriptions (backend SubscriptionPlanResponse / SubscriptionResponse) ---

export const MOCK_PLANS = {
  success: true,
  data: [
    { id: 'basic', name: 'Basic', price: 299, maxBooks: 2, features: ['2 books at a time', 'SMS notifications'], popular: false },
    { id: 'standard', name: 'Standard', price: 499, maxBooks: 4, features: ['4 books at a time', 'WhatsApp support'], popular: true },
    { id: 'premium', name: 'Premium', price: 799, maxBooks: 6, features: ['6 books at a time', 'Free home delivery'], popular: false },
    { id: 'family', name: 'Family', price: 1199, maxBooks: 8, features: ['8 books at a time', 'Home delivery', 'Community events'], popular: false },
  ],
};

export const MOCK_SUBSCRIPTION_BASIC = {
  success: true,
  data: {
    id: 'sub-1',
    plan: 'basic',
    monthlyPrice: 299,
    startDate: daysFromNow(-30),
    endDate: null,
    status: 'active',
    maxConcurrentLoans: 2,
  },
};

export const MOCK_SUBSCRIBE_STANDARD_SUCCESS = {
  success: true,
  data: {
    id: 'sub-2',
    plan: 'standard',
    monthlyPrice: 499,
    startDate: daysFromNow(0),
    endDate: null,
    status: 'active',
    maxConcurrentLoans: 4,
  },
};

// --- Users (backend UserResponse) ---

export const MOCK_PROFILE = {
  success: true,
  data: {
    id: 'user-1',
    email: 'member@example.com',
    name: 'Test Member',
    role: 'member',
    phone: '+91 98765 43210',
    address: '12 Beach Road, Chennai',
  },
};

export const MOCK_PROFILE_UPDATED = {
  success: true,
  data: { ...MOCK_PROFILE.data, name: 'Test Reader', phone: '+91 90000 00000' },
};

// --- Admin (backend AdminUserResponse / AdminLoanResponse) ---

export const MOCK_ADMIN_USERS = {
  success: true,
  data: [
    {
      id: 'user-1',
      name: 'Test Member',
      email: 'member@example.com',
      role: 'member',
      active: true,
      plan: 'basic',
      activeLoans: 2,
      joinedAt: daysFromNow(-90),
    },
    {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      active: true,
      plan: null,
      activeLoans: 0,
      joinedAt: daysFromNow(-200),
    },
  ],
};

export const MOCK_ADMIN_LOANS = {
  success: true,
  data: [
    {
      id: 'aloan-1',
      bookId: 'book-1',
      bookTitle: 'The Great Gatsby',
      memberName: 'Test Member',
      memberEmail: 'member@example.com',
      borrowedAt: daysFromNow(-3),
      dueDate: daysFromNow(11),
      returnedAt: null,
      status: 'ACTIVE',
    },
    {
      id: 'aloan-2',
      bookId: 'book-3',
      bookTitle: 'Ponniyin Selvan',
      memberName: 'Test Member',
      memberEmail: 'member@example.com',
      borrowedAt: daysFromNow(-20),
      dueDate: daysFromNow(-6),
      returnedAt: null,
      status: 'OVERDUE',
    },
  ],
};

export const MOCK_ADMIN_LOANS_OVERDUE = {
  success: true,
  data: [MOCK_ADMIN_LOANS.data[1]],
};

export const MOCK_BOOK_CREATED = {
  success: true,
  data: { ...MOCK_BOOK_ITEMS[0], id: 'book-new', title: 'New Book' },
};

// --- Learn (backend CourseSummaryResponse / CourseDetailResponse / EnrollmentResponse) ---

export const MOCK_COURSE_SUMMARY = {
  id: 'course-1',
  slug: 'money-foundations',
  title: 'Money Foundations',
  track: 'MONEY_FOUNDATIONS',
  level: 'BEGINNER',
  language: 'English',
  summary: 'The essentials before you invest a single rupee.',
  price: 0,
  status: 'PUBLISHED',
  moduleCount: 2,
  lessonCount: 3,
};

export const MOCK_COURSES = {
  success: true,
  data: {
    content: [MOCK_COURSE_SUMMARY],
    totalPages: 1,
    totalElements: 1,
    currentPage: 0,
    pageSize: 20,
    hasNext: false,
    hasPrev: false,
  },
};

export const MOCK_COURSES_EMPTY = {
  success: true,
  data: {
    content: [],
    totalPages: 0,
    totalElements: 0,
    currentPage: 0,
    pageSize: 20,
    hasNext: false,
    hasPrev: false,
  },
};

export const MOCK_COURSE_DETAIL = {
  success: true,
  data: {
    ...MOCK_COURSE_SUMMARY,
    modules: [
      {
        id: 'module-1',
        title: 'Why bother investing?',
        sortOrder: 0,
        lessons: [
          {
            id: 'lesson-1',
            title: 'Saving vs. investing',
            kind: 'ARTICLE',
            contentUrl: null,
            body: 'Saving protects money; investing grows it.',
            estMinutes: 8,
            sortOrder: 0,
          },
          {
            id: 'lesson-2',
            title: 'The magic of compounding',
            kind: 'ARTICLE',
            contentUrl: null,
            body: 'Returns earn their own returns over time.',
            estMinutes: 10,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'module-2',
        title: 'Understanding risk',
        sortOrder: 1,
        lessons: [
          {
            id: 'lesson-3',
            title: 'What "risk" really means',
            kind: 'ARTICLE',
            contentUrl: null,
            body: 'Risk is uncertainty in returns, not certain loss.',
            estMinutes: 9,
            sortOrder: 0,
          },
        ],
      },
    ],
  },
};

export const MOCK_ENROLLMENTS_EMPTY = { success: true, data: [] };

export const MOCK_ENROLLMENT_CREATED = {
  success: true,
  data: {
    id: 'enrollment-1',
    courseId: 'course-1',
    courseSlug: 'money-foundations',
    courseTitle: 'Money Foundations',
    status: 'ACTIVE',
    enrolledAt: daysFromNow(0),
    totalLessons: 3,
    completedLessons: 0,
    nextLessonId: 'lesson-1',
    amountPaid: 0,
  },
};

export const MOCK_ENROLLMENTS = {
  success: true,
  data: [MOCK_ENROLLMENT_CREATED.data],
};

export const MOCK_ENROLLMENTS_IN_PROGRESS = {
  success: true,
  data: [{ ...MOCK_ENROLLMENT_CREATED.data, completedLessons: 1, nextLessonId: 'lesson-2' }],
};

export const MOCK_ENROLLMENTS_COMPLETE = {
  success: true,
  data: [{ ...MOCK_ENROLLMENT_CREATED.data, completedLessons: 3, nextLessonId: null }],
};

export const MOCK_ENROLL_ALREADY_FAILURE = {
  success: false,
  error: "You're already enrolled in this course",
};

// --- Payments (L5: paid enrollment/batch fees) ---

export const MOCK_COURSE_SUMMARY_PAID = {
  ...MOCK_COURSE_SUMMARY,
  id: 'course-paid-1',
  slug: 'paid-course',
  title: 'Advanced Derivatives',
  price: 499,
};

export const MOCK_COURSE_DETAIL_PAID = {
  success: true,
  data: { ...MOCK_COURSE_SUMMARY_PAID, modules: [] },
};

export const MOCK_ENROLLMENT_CREATED_PAID = {
  success: true,
  data: {
    id: 'enrollment-paid-1',
    courseId: 'course-paid-1',
    courseSlug: 'paid-course',
    courseTitle: 'Advanced Derivatives',
    status: 'ACTIVE',
    enrolledAt: daysFromNow(0),
    totalLessons: 0,
    completedLessons: 0,
    nextLessonId: null,
    amountPaid: 499,
  },
};

export const MOCK_PAYMENT_REQUIRED_FAILURE = {
  success: false,
  error: 'Payment details are required for this course',
};

export const MOCK_PAYMENT_DECLINED_FAILURE = {
  success: false,
  error: 'Your card was declined — please try a different card',
};

// --- Learn progress (backend CourseProgressResponse) ---

export const MOCK_COURSE_PROGRESS_EMPTY = {
  success: true,
  data: {
    courseId: 'course-1',
    totalLessons: 3,
    completedLessons: 0,
    completedLessonIds: [],
    nextLessonId: 'lesson-1',
  },
};

export const MOCK_COURSE_PROGRESS_PARTIAL = {
  success: true,
  data: {
    courseId: 'course-1',
    totalLessons: 3,
    completedLessons: 1,
    completedLessonIds: ['lesson-1'],
    nextLessonId: 'lesson-2',
  },
};

export const MOCK_COURSE_PROGRESS_COMPLETE = {
  success: true,
  data: {
    courseId: 'course-1',
    totalLessons: 3,
    completedLessons: 3,
    completedLessonIds: ['lesson-1', 'lesson-2', 'lesson-3'],
    nextLessonId: null,
  },
};

export const MOCK_PROGRESS_NOT_ENROLLED_FAILURE = {
  success: false,
  error: 'You must enroll in this course first',
};

export const MOCK_ADMIN_COURSES = {
  success: true,
  data: [
    MOCK_COURSE_SUMMARY,
    {
      ...MOCK_COURSE_SUMMARY,
      id: 'course-2',
      slug: 'equities-101',
      title: 'Equities 101',
      track: 'EQUITIES',
      status: 'DRAFT',
      moduleCount: 0,
      lessonCount: 0,
    },
  ],
};

export const MOCK_COURSE_CREATED = {
  success: true,
  data: { ...MOCK_COURSE_SUMMARY, id: 'course-new', slug: 'new-course', title: 'New Course', status: 'DRAFT', moduleCount: 0, lessonCount: 0 },
};

export const MOCK_MODULE_CREATED = {
  success: true,
  data: { id: 'module-new', title: 'New Module', sortOrder: 2, lessons: [] },
};

export const MOCK_LESSON_CREATED = {
  success: true,
  data: {
    id: 'lesson-new',
    title: 'New Lesson',
    kind: 'ARTICLE',
    contentUrl: null,
    body: null,
    estMinutes: 10,
    sortOrder: 0,
  },
};

// --- Notifications (backend NotificationResponse) ---

export const MOCK_NOTIFICATIONS = {
  success: true,
  data: [
    {
      id: 'notif-1',
      type: 'loan.created',
      title: 'You borrowed "The Great Gatsby"',
      body: 'Due back on 2026-07-20. Happy reading!',
      read: false,
      createdAt: daysFromNow(0),
    },
    {
      id: 'notif-2',
      type: 'subscription.changed',
      title: "You're now on the PREMIUM plan",
      body: 'Your subscription change is active immediately.',
      read: true,
      createdAt: daysFromNow(-2),
    },
  ],
};

// --- Learn tests / attempts / certificates (backend Test*/Attempt*/Certificate* responses) ---

export const MOCK_TESTS = {
  success: true,
  data: [
    {
      id: 'test-1',
      title: 'Module 1 Check',
      passPercent: 70,
      timeLimitMin: 10,
      attemptsAllowed: 2,
      attemptsUsed: 0,
      bestScorePercent: null,
      passed: false,
    },
  ],
};

export const MOCK_TESTS_EXHAUSTED = {
  success: true,
  data: [{ ...MOCK_TESTS.data[0], attemptsUsed: 2, bestScorePercent: 40, passed: false }],
};

export const MOCK_TEST_FOR_LEARNER = {
  success: true,
  data: {
    id: 'test-1',
    title: 'Module 1 Check',
    passPercent: 70,
    timeLimitMin: 10,
    attemptsAllowed: 2,
    attemptsUsed: 0,
    questions: [
      {
        id: 'question-1',
        prompt: 'Which grows your wealth over decades?',
        kind: 'SINGLE',
        sortOrder: 0,
        options: [
          { id: 'option-1a', label: 'Saving', sortOrder: 0 },
          { id: 'option-1b', label: 'Investing', sortOrder: 1 },
        ],
      },
      {
        id: 'question-2',
        prompt: 'Risk means certain loss.',
        kind: 'TRUEFALSE',
        sortOrder: 1,
        options: [
          { id: 'option-2a', label: 'True', sortOrder: 0 },
          { id: 'option-2b', label: 'False', sortOrder: 1 },
        ],
      },
    ],
  },
};

export const MOCK_ATTEMPT_START = {
  success: true,
  data: { attemptId: 'attempt-1', testId: 'test-1', startedAt: daysFromNow(0), timeLimitMin: 10 },
};

export const MOCK_ATTEMPT_RESULT_PASS = {
  success: true,
  data: {
    attemptId: 'attempt-1',
    scorePercent: 100,
    passed: true,
    attemptsUsed: 1,
    attemptsAllowed: 2,
    certificateIssued: true,
    certificateSerial: 'SUV-ABCD1234',
    questionResults: [
      {
        questionId: 'question-1',
        correct: true,
        correctOptionIds: ['option-1b'],
        selectedOptionIds: ['option-1b'],
      },
      {
        questionId: 'question-2',
        correct: true,
        correctOptionIds: ['option-2b'],
        selectedOptionIds: ['option-2b'],
      },
    ],
  },
};

export const MOCK_ATTEMPT_RESULT_FAIL = {
  success: true,
  data: {
    attemptId: 'attempt-1',
    scorePercent: 0,
    passed: false,
    attemptsUsed: 1,
    attemptsAllowed: 2,
    certificateIssued: false,
    certificateSerial: null,
    questionResults: [
      {
        questionId: 'question-1',
        correct: false,
        correctOptionIds: ['option-1b'],
        selectedOptionIds: ['option-1a'],
      },
      {
        questionId: 'question-2',
        correct: false,
        correctOptionIds: ['option-2b'],
        selectedOptionIds: ['option-2a'],
      },
    ],
  },
};

export const MOCK_CERTIFICATES = {
  success: true,
  data: [
    {
      id: 'cert-1',
      courseTitle: 'Money Foundations',
      courseSlug: 'money-foundations',
      issuedAt: daysFromNow(0),
      serial: 'SUV-ABCD1234',
    },
  ],
};

export const MOCK_CERTIFICATES_EMPTY = { success: true, data: [] };

export const MOCK_CERTIFICATE_VERIFY = {
  success: true,
  data: {
    serial: 'SUV-ABCD1234',
    learnerName: 'Test Member',
    courseTitle: 'Money Foundations',
    issuedAt: daysFromNow(0),
  },
};

export const MOCK_CERTIFICATE_VERIFY_NOT_FOUND = {
  success: false,
  error: 'No certificate found for serial: SUV-NOPE',
};

export const MOCK_ADMIN_TESTS = {
  success: true,
  data: [
    { id: 'test-1', title: 'Module 1 Check', passPercent: 70, timeLimitMin: 10, attemptsAllowed: 2, questionCount: 2 },
  ],
};

export const MOCK_ADMIN_TEST_DETAIL = {
  success: true,
  data: {
    id: 'test-1',
    title: 'Module 1 Check',
    passPercent: 70,
    timeLimitMin: 10,
    attemptsAllowed: 2,
    questions: [
      {
        id: 'question-1',
        prompt: 'Which grows your wealth over decades?',
        kind: 'SINGLE',
        sortOrder: 0,
        options: [
          { id: 'option-1a', label: 'Saving', correct: false, sortOrder: 0 },
          { id: 'option-1b', label: 'Investing', correct: true, sortOrder: 1 },
        ],
      },
    ],
  },
};

export const MOCK_TEST_CREATED = {
  success: true,
  data: { id: 'test-new', title: 'New Test', passPercent: 70, timeLimitMin: 10, attemptsAllowed: 2, questionCount: 0 },
};

export const MOCK_QUESTION_CREATED = {
  success: true,
  data: {
    id: 'question-new',
    prompt: 'New question?',
    kind: 'SINGLE',
    sortOrder: 0,
    options: [
      { id: 'option-new-a', label: 'Option A', correct: false, sortOrder: 0 },
      { id: 'option-new-b', label: 'Option B', correct: true, sortOrder: 1 },
    ],
  },
};

// --- Batches, venues and bookings (L4: in-person classes) ---

export const MOCK_VENUES = {
  success: true,
  data: [
    { id: 'venue-1', name: 'Suvadi Hall', address: '12 Cathedral Rd', city: 'Chennai', capacityDefault: 20 },
  ],
};

export const MOCK_VENUE_CREATED = {
  success: true,
  data: { id: 'venue-new', name: 'New Venue', address: null, city: 'Coimbatore', capacityDefault: 15 },
};

export const MOCK_BATCH_FOR_LEARNER = {
  id: 'batch-1',
  venueName: 'Suvadi Hall',
  city: 'Chennai',
  instructorName: 'Priya Raman',
  startsOn: '2026-08-01',
  endsOn: '2026-08-02',
  scheduleText: 'Sat-Sun, 10am-1pm',
  fee: 0,
  seatsAvailable: 1,
  myBookingStatus: null as 'CONFIRMED' | 'WAITLISTED' | null,
};

export const MOCK_BATCHES_FOR_LEARNER = { success: true, data: [MOCK_BATCH_FOR_LEARNER] };

export const MOCK_BATCHES_FOR_LEARNER_FULL = {
  success: true,
  data: [{ ...MOCK_BATCH_FOR_LEARNER, seatsAvailable: 0 }],
};

export const MOCK_BATCHES_FOR_LEARNER_BOOKED = {
  success: true,
  data: [{ ...MOCK_BATCH_FOR_LEARNER, seatsAvailable: 0, myBookingStatus: 'CONFIRMED' }],
};

export const MOCK_BOOKING_CONFIRMED = {
  success: true,
  data: {
    id: 'booking-1',
    batchId: 'batch-1',
    courseTitle: 'Money Foundations',
    venueName: 'Suvadi Hall',
    startsOn: '2026-08-01',
    endsOn: '2026-08-02',
    status: 'CONFIRMED',
    bookedAt: daysFromNow(0),
    amountPaid: 0,
  },
};

export const MOCK_BOOKING_WAITLISTED = {
  success: true,
  data: { ...MOCK_BOOKING_CONFIRMED.data, id: 'booking-2', status: 'WAITLISTED' },
};

export const MOCK_MY_BOOKINGS_EMPTY = { success: true, data: [] };
export const MOCK_MY_BOOKINGS = { success: true, data: [MOCK_BOOKING_CONFIRMED.data] };
export const MOCK_CANCEL_BOOKING_SUCCESS = { success: true, data: null };

export const MOCK_BATCH_FOR_LEARNER_PAID = {
  ...MOCK_BATCH_FOR_LEARNER,
  id: 'batch-paid-1',
  fee: 350,
  seatsAvailable: 1,
};

export const MOCK_BATCHES_FOR_LEARNER_PAID = { success: true, data: [MOCK_BATCH_FOR_LEARNER_PAID] };

export const MOCK_BATCHES_FOR_LEARNER_PAID_FULL = {
  success: true,
  data: [{ ...MOCK_BATCH_FOR_LEARNER_PAID, seatsAvailable: 0 }],
};

export const MOCK_BOOKING_CONFIRMED_PAID = {
  success: true,
  data: { ...MOCK_BOOKING_CONFIRMED.data, id: 'booking-paid-1', batchId: 'batch-paid-1', amountPaid: 350 },
};

export const MOCK_PAYMENT_REQUIRED_BATCH_FAILURE = {
  success: false,
  error: 'Payment details are required for this batch',
};

export const MOCK_PAYMENT_DECLINED_BATCH_FAILURE = {
  success: false,
  error: 'Your card was declined — please try a different card',
};

export const MOCK_ADMIN_BATCHES = {
  success: true,
  data: [
    {
      id: 'batch-1',
      venueName: 'Suvadi Hall',
      instructorName: 'Priya Raman',
      startsOn: '2026-08-01',
      endsOn: '2026-08-02',
      scheduleText: 'Sat-Sun, 10am-1pm',
      capacity: 1,
      fee: 0,
      status: 'DRAFT',
      confirmedCount: 0,
      waitlistedCount: 0,
    },
  ],
};

export const MOCK_ADMIN_BATCH_CREATED = {
  success: true,
  data: { ...MOCK_ADMIN_BATCHES.data[0], id: 'batch-new' },
};

export const MOCK_ADMIN_BATCH_PUBLISHED = {
  success: true,
  data: { ...MOCK_ADMIN_BATCHES.data[0], status: 'PUBLISHED' },
};

export const MOCK_ADMIN_BATCH_DETAIL = {
  success: true,
  data: {
    id: 'batch-1',
    venueName: 'Suvadi Hall',
    instructorName: 'Priya Raman',
    startsOn: '2026-08-01',
    endsOn: '2026-08-02',
    scheduleText: 'Sat-Sun, 10am-1pm',
    capacity: 1,
    fee: 0,
    status: 'DRAFT',
    sessions: [{ id: 'session-1', sessionDate: '2026-08-01', topic: 'Intro session' }],
    roster: [
      {
        bookingId: 'booking-1',
        userId: 'user-1',
        userName: 'Test Member',
        userEmail: 'member@example.com',
        status: 'CONFIRMED',
        bookedAt: daysFromNow(0),
      },
    ],
  },
};

export const MOCK_ATTENDANCE_MARKED = { success: true, data: null };

export const MOCK_NOTIFICATIONS_EMPTY = { success: true, data: [] };
export const MOCK_UNREAD_COUNT = { success: true, data: { count: 1 } };
export const MOCK_UNREAD_COUNT_ZERO = { success: true, data: { count: 0 } };
export const MOCK_NOTIFICATION_MARKED_READ = {
  success: true,
  data: { ...MOCK_NOTIFICATIONS.data[0], read: true },
};

// --- Learn analytics (L6) ---

export const MOCK_ADMIN_ANALYTICS = {
  success: true,
  data: {
    totalEnrollments: 2,
    totalRevenue: 255,
    completionFunnel: { enrolled: 2, startedLesson: 1, completedAllLessons: 1, certified: 0 },
    enrollmentsByDay: [{ date: '2026-07-01', count: 2 }],
    revenueByCourse: [{ courseTitle: 'Analytics Course', revenue: 255 }],
    attendanceRatePercent: 100,
  },
};

export const MOCK_ADMIN_ANALYTICS_EMPTY = {
  success: true,
  data: {
    totalEnrollments: 0,
    totalRevenue: 0,
    completionFunnel: { enrolled: 0, startedLesson: 0, completedAllLessons: 0, certified: 0 },
    enrollmentsByDay: [],
    revenueByCourse: [],
    attendanceRatePercent: 0,
  },
};
