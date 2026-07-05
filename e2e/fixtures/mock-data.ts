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
