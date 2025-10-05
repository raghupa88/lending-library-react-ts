import React from 'react';
import { Book } from '../../types';
import Button from '../Button/Button';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onReserve?: (bookId: string) => void;
  onAddToWishlist?: (bookId: string) => void;
  onViewDetails?: (bookId: string) => void;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  onReserve,
  onAddToWishlist,
  onViewDetails,
}) => {
  const handleReserve = () => {
    if (onReserve && book.available) {
      onReserve(book.id);
    }
  };

  const handleAddToWishlist = () => {
    if (onAddToWishlist) {
      onAddToWishlist(book.id);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(book.id);
    }
  };

  return (
    <div className="book-card">
      <div className="book-card__image">
        <img src={book.cover} alt={book.title} />
        {!book.available && (
          <div className="book-card__unavailable">Unavailable</div>
        )}
      </div>

      <div className="book-card__content">
        <h3 className="book-card__title">{book.title}</h3>
        <p className="book-card__author">by {book.author}</p>
        <div className="book-card__meta">
          <span className="book-card__genre">{book.genre}</span>
          <span className="book-card__language">{book.language}</span>
        </div>
        <div className="book-card__rating">
          {'★'.repeat(Math.floor(book.rating))} {book.rating}
        </div>
        <p className="book-card__description">{book.description}</p>
      </div>

      <div className="book-card__actions">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          disabled={!book.available}
          onClick={handleReserve}
        >
          {book.available ? 'Reserve' : 'Unavailable'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={handleAddToWishlist}
        >
          Add to Wishlist
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleViewDetails}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default BookCard;