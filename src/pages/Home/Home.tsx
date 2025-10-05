import React from "react";
import { useNavigate } from "react-router-dom";
import { useBooks } from "../../context/BookContext";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button/Button";
import BookCard from "../../components/BookCard/BookCard";
import "./Home.css";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { books } = useBooks();
  const { user } = useAuth();

  const featuredBooks = books.slice(0, 6);

  const handleGetStarted = () => {
    if (user) {
      navigate("/books");
    } else {
      navigate("/register");
    }
  };

  const handleViewDetails = (bookId: string) => {
    navigate(`/books/${bookId}`);
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero__content">
            <h1 className="hero__title">Your Digital Reading Partner</h1>
            <p className="hero__description">
              Discover thousands of books with our subscription-based lending
              library. Get books delivered to your doorstep and join our reading
              community.
            </p>
            <div className="hero__actions">
              <Button size="lg" onClick={handleGetStarted}>
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/plans")}
              >
                View Plans
              </Button>
            </div>
          </div>
          <div className="hero__image">
            <img
              src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop"
              alt="Reading"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose XXXXX Library?</h2>
          <div className="features__grid">
            <div className="feature">
              <div className="feature__icon">🚚</div>
              <h3 className="feature__title">Home Delivery</h3>
              <p className="feature__description">
                Get books delivered to your doorstep with our premium plans
              </p>
            </div>
            <div className="feature">
              <div className="feature__icon">📚</div>
              <h3 className="feature__title">Vast Collection</h3>
              <p className="feature__description">
                Access thousands of books across multiple genres and languages
              </p>
            </div>
            <div className="feature">
              <div className="feature__icon">👥</div>
              <h3 className="feature__title">Reading Community</h3>
              <p className="feature__description">
                Join book clubs, events, and connect with fellow readers
              </p>
            </div>
            <div className="feature">
              <div className="feature__icon">💰</div>
              <h3 className="feature__title">Affordable Plans</h3>
              <p className="feature__description">
                Flexible subscription plans starting from just ₹299/month
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="featured-books">
        <div className="container">
          <h2 className="section-title">Featured Books</h2>
          <div className="books-grid">
            {featuredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
          <div className="featured-books__actions">
            <Button onClick={() => navigate("/books")}>View All Books</Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta__content">
            <h2 className="cta__title">Ready to Start Reading?</h2>
            <p className="cta__description">
              Join thousands of readers and start your literary journey today
            </p>
            <Button size="lg" onClick={handleGetStarted}>
              Start Your Subscription
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
