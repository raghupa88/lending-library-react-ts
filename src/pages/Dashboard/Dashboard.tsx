import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBooks } from '../../context/BookContext';
import BookCard from '../../components/BookCard/BookCard';
import Button from '../../components/Button/Button';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { books } = useBooks();

  if (!user) return null;

  const currentBooks = books.filter(book => user.currentBooks.includes(book.id));
  const wishlistBooks = books.filter(book => user.wishlist?.includes(book.id));

  const handleReturnBook = (bookId: string) => {
    alert(`Book ${bookId} return requested!`);
  };

  const handleRenewBook = (bookId: string) => {
    alert(`Book ${bookId} renewed!`);
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard__header">
          <h1 className="dashboard__title">My Dashboard</h1>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        {/* User Stats */}
        <div className="dashboard__stats">
          <div className="stat-card">
            <h3>Books Read</h3>
            <p className="stat-number">{user.booksRead}</p>
          </div>
          <div className="stat-card">
            <h3>Currently Reading</h3>
            <p className="stat-number">{currentBooks.length}</p>
          </div>
          <div className="stat-card">
            <h3>Plan</h3>
            <p className="stat-text">{user.plan}</p>
          </div>
          <div className="stat-card">
            <h3>Member Since</h3>
            <p className="stat-text">{new Date(user.joinDate).getFullYear()}</p>
          </div>
        </div>

        {/* Current Books */}
        <section className="dashboard__section">
          <h2 className="section__title">Currently Borrowed</h2>
          {currentBooks.length > 0 ? (
            <div className="books__grid">
              {currentBooks.map(book => (
                <div key={book.id} className="borrowed-book">
                  <BookCard book={book} />
                  <div className="borrowed-book__actions">
                    <Button size="sm" onClick={() => handleReturnBook(book.id)}>
                      Return
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRenewBook(book.id)}>
                      Renew
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No books currently borrowed</p>
          )}
        </section>

        {/* Profile Section */}
        <section className="dashboard__section">
          <h2 className="section__title">Profile Information</h2>
          <div className="profile-info">
            <div className="profile-field">
              <label>Name</label>
              <p>{user.name}</p>
            </div>
            <div className="profile-field">
              <label>Email</label>
              <p>{user.email}</p>
            </div>
            <div className="profile-field">
              <label>Role</label>
              <p>{user.role}</p>
            </div>
            <div className="profile-field">
              <label>Current Plan</label>
              <p>{user.plan}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;