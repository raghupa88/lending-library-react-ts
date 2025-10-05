import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Button from "../Button/Button";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar__content">
          {/* Brand */}
          <Link to="/" className="navbar__brand" onClick={closeMenu}>
            📚 XXXXX Library
          </Link>

          {/* Desktop Navigation */}
          <div className="navbar__nav">
            <Link
              to="/"
              className={`navbar__link ${isActive("/") ? "active" : ""}`}
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link
              to="/books"
              className={`navbar__link ${isActive("/books") ? "active" : ""}`}
              onClick={closeMenu}
            >
              Books
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className={`navbar__link ${
                  isActive("/dashboard") ? "active" : ""
                }`}
                onClick={closeMenu}
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="navbar__actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            {user ? (
              <div className="user-menu">
                <span className="user-greeting">
                  Hi, {user.name.split(" ")[0]}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="auth-buttons">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate("/login");
                    closeMenu();
                  }}
                >
                  Login
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mobile-menu">
            <Link
              to="/"
              className={`mobile-menu__link ${isActive("/") ? "active" : ""}`}
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link
              to="/books"
              className={`mobile-menu__link ${
                isActive("/books") ? "active" : ""
              }`}
              onClick={closeMenu}
            >
              Books
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className={`mobile-menu__link ${
                  isActive("/dashboard") ? "active" : ""
                }`}
                onClick={closeMenu}
              >
                Dashboard
              </Link>
            )}
            {!user && (
              <div className="mobile-menu__auth">
                <Button
                  fullWidth
                  onClick={() => {
                    navigate("/login");
                    closeMenu();
                  }}
                >
                  Login
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
