// Raw API auth response shape — mirrors backend AuthResponse.java (userId, not id)
export const MOCK_USER = {
  userId: 'user-1',
  email: 'member@example.com',
  name: 'Test Member',
  role: 'member',
  plan: 'basic',
  accessToken: 'test-access-token-123',
  refreshToken: 'test-refresh-token-123',
};

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
