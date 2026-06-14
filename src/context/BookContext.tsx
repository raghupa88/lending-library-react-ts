import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Book, BookFilter } from '../types';
import { apiFetch } from '../lib/api';

interface BookContextType {
  books: Book[];
  filteredBooks: Book[];
  filters: BookFilter;
  searchTerm: string;
  isLoading: boolean;
  setFilters: (filters: BookFilter) => void;
  setSearchTerm: (term: string) => void;
  getBookById: (id: string) => Book | undefined;
  addToWishlist: (bookId: string) => void;
  removeFromWishlist: (bookId: string) => void;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export const useBooks = () => {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error('useBooks must be used within a BookProvider');
  }
  return context;
};

interface BookProviderProps {
  children: ReactNode;
}

interface BookApiItem {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  isbn: string;
  available: boolean;
  rating: number;
  coverUrl: string;
  description: string;
  publishedYear?: number;
  pageCount?: number;
}

interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function mapBook(b: BookApiItem): Book {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    language: b.language,
    isbn: b.isbn,
    available: b.available,
    rating: b.rating,
    cover: b.coverUrl,
    description: b.description,
    publishedYear: b.publishedYear,
    pages: b.pageCount,
  };
}

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filters, setFilters] = useState<BookFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (filters.genre) params.set('genre', filters.genre);
      if (filters.language) params.set('language', filters.language);
      if (filters.available !== undefined) params.set('available', String(filters.available));
      params.set('size', '100');

      const query = params.toString();
      const res = await apiFetch<PagedResponse<BookApiItem>>(`/books${query ? `?${query}` : ''}`);

      if (res.success && res.data) {
        setBooks(res.data.content.map(mapBook));
      }
    } catch {
      // Keep existing books on error
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // filteredBooks is now the full API result (filtering is server-side)
  const filteredBooks = books;

  const getBookById = (id: string): Book | undefined => {
    return books.find(book => book.id === id);
  };

  const addToWishlist = (bookId: string) => {
    console.log('Added to wishlist:', bookId);
  };

  const removeFromWishlist = (bookId: string) => {
    console.log('Removed from wishlist:', bookId);
  };

  const value: BookContextType = {
    books,
    filteredBooks,
    filters,
    searchTerm,
    isLoading,
    setFilters,
    setSearchTerm,
    getBookById,
    addToWishlist,
    removeFromWishlist,
  };

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
};
