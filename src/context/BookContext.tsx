import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Book, BookFilter } from '../types';

interface BookContextType {
  books: Book[];
  filteredBooks: Book[];
  filters: BookFilter;
  searchTerm: string;
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

// Mock books data
const mockBooks: Book[] = [
  {
    id: '1',
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    genre: 'Fiction',
    language: 'English',
    isbn: '978-0-06-231500-7',
    available: true,
    rating: 4.5,
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=400&fit=crop',
    description: 'A magical story about following your dreams and finding your destiny.',
  },
  {
    id: '2',
    title: 'Ponniyin Selvan',
    author: 'Kalki Krishnamurthy',
    genre: 'Historical Fiction',
    language: 'Tamil',
    isbn: '978-8-12-345678-9',
    available: true,
    rating: 4.8,
    cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
    description: 'Epic Tamil historical novel set in the Chola dynasty.',
  },
  {
    id: '3',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    genre: 'Non-fiction',
    language: 'English',
    isbn: '978-0-06-231609-7',
    available: false,
    rating: 4.6,
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
    description: 'A brief history of humankind and our evolution.',
  },
  // Add more books as needed
];

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  const [books] = useState<Book[]>(mockBooks);
  const [filters, setFilters] = useState<BookFilter>({});
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = books.filter(book => {
    const matchesSearch = !searchTerm || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGenre = !filters.genre || book.genre === filters.genre;
    const matchesLanguage = !filters.language || book.language === filters.language;
    const matchesAvailability = filters.available === undefined || book.available === filters.available;

    return matchesSearch && matchesGenre && matchesLanguage && matchesAvailability;
  });

  const getBookById = (id: string): Book | undefined => {
    return books.find(book => book.id === id);
  };

  const addToWishlist = (bookId: string) => {
    // Mock implementation - in real app, this would update user's wishlist
    console.log('Added to wishlist:', bookId);
  };

  const removeFromWishlist = (bookId: string) => {
    // Mock implementation - in real app, this would update user's wishlist
    console.log('Removed from wishlist:', bookId);
  };

  const value: BookContextType = {
    books,
    filteredBooks,
    filters,
    searchTerm,
    setFilters,
    setSearchTerm,
    getBookById,
    addToWishlist,
    removeFromWishlist,
  };

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
};