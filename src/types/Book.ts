export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  isbn: string;
  available: boolean;
  rating: number;
  cover: string;
  description: string;
  publishedYear?: number;
  pages?: number;
  reviews?: Review[];
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface BookFilter {
  genre?: string;
  language?: string;
  available?: boolean;
  search?: string;
}