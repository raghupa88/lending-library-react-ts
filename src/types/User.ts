export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  plan: string;
  joinDate: string;
  booksRead: number;
  currentBooks: string[];
  wishlist?: string[];
  phone?: string;
  address?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}