// Raw API auth response shape (what the backend returns)
export const MOCK_USER = {
  id: 'user-1',
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

export const MOCK_BOOKS = {
  success: true,
  data: {
    content: [
      {
        id: 'book-1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        genre: 'Fiction',
        language: 'English',
        isbn: '978-0-7432-7356-5',
        available: true,
        rating: 4.5,
        coverUrl: 'https://example.com/gatsby.jpg',
        description: 'A classic American novel.',
        publishedYear: 1925,
        pageCount: 180,
      },
      {
        id: 'book-2',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        genre: 'Fiction',
        language: 'English',
        isbn: '978-0-06-112008-4',
        available: false,
        rating: 4.8,
        coverUrl: 'https://example.com/mockingbird.jpg',
        description: 'A powerful story of racial injustice.',
        publishedYear: 1960,
        pageCount: 281,
      },
      {
        id: 'book-3',
        title: 'Ponniyin Selvan',
        author: 'Kalki Krishnamurthy',
        genre: 'Historical Fiction',
        language: 'Tamil',
        isbn: '978-81-234-0001-1',
        available: true,
        rating: 4.9,
        coverUrl: 'https://example.com/ps1.jpg',
        description: 'An epic historical novel.',
        publishedYear: 1955,
        pageCount: 2400,
      },
    ],
    totalPages: 1,
    totalElements: 3,
    currentPage: 0,
    pageSize: 100,
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
    pageSize: 100,
    hasNext: false,
    hasPrev: false,
  },
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
