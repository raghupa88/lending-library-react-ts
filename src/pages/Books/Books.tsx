import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../../context/BookContext';
import BookCard from '../../components/BookCard/BookCard';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import './Books.css';

const Books: React.FC = () => {
  const navigate = useNavigate();
  const { filteredBooks, filters, setFilters, setSearchTerm, searchTerm } = useBooks();
  const [selectedGenre, setSelectedGenre] = useState(filters.genre || '');
  const [selectedLanguage, setSelectedLanguage] = useState(filters.language || '');
  const [showAvailableOnly, setShowAvailableOnly] = useState(filters.available || false);

  const genres = ['Fiction', 'Non-fiction', 'Historical Fiction', 'Fantasy', 'Children', 'Biography', 'Tamil Literature'];
  const languages = ['English', 'Tamil', 'Hindi', 'Malayalam'];

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = () => {
    setFilters({
      genre: selectedGenre || undefined,
      language: selectedLanguage || undefined,
      available: showAvailableOnly || undefined,
    });
  };

  const clearFilters = () => {
    setSelectedGenre('');
    setSelectedLanguage('');
    setShowAvailableOnly(false);
    setFilters({});
    setSearchTerm('');
  };

  const handleViewDetails = (bookId: string) => {
    navigate(`/books/${bookId}`);
  };

  const handleReserve = (bookId: string) => {
    // Mock reservation - in real app, this would make API call
    alert(`Book ${bookId} reserved successfully!`);
  };

  return (
    <div className="books">
      <div className="container">
        <div className="books__header">
          <h1 className="books__title">Book Catalog</h1>
          <p className="books__description">
            Discover your next great read from our extensive collection
          </p>
        </div>

        {/* Search and Filters */}
        <div className="books__filters">
          <div className="filters__search">
            <Input
              type="text"
              placeholder="Search books, authors..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              fullWidth
            />
          </div>

          <div className="filters__controls">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="filter-select"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="filter-select"
            >
              <option value="">All Languages</option>
              {languages.map(language => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>

            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
              />
              Available only
            </label>

            <Button onClick={handleFilterChange} size="sm">
              Apply Filters
            </Button>

            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="books__results">
          <p className="results__count">
            {filteredBooks.length} books found
          </p>

          <div className="books__grid">
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onReserve={handleReserve}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="no-results">
              <h3>No books found</h3>
              <p>Try adjusting your search or filter criteria</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Books;