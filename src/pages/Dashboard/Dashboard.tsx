import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button/Button';
import './Dashboard.css';

// Legacy screen: replaced wholesale by the member-core redesign, which wires
// real loans from GET /loans instead of the always-empty user.currentBooks.
const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

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
            <p className="stat-number">0</p>
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
          <p className="empty-state">No books currently borrowed</p>
        </section>

        {/* Profile Section */}
        <section className="dashboard__section">
          <h2 className="section__title">Profile Information</h2>
          <div className="profile-info">
            <div className="profile-field">
              <span className="profile-label">Name</span>
              <p>{user.name}</p>
            </div>
            <div className="profile-field">
              <span className="profile-label">Email</span>
              <p>{user.email}</p>
            </div>
            <div className="profile-field">
              <span className="profile-label">Role</span>
              <p>{user.role}</p>
            </div>
            <div className="profile-field">
              <span className="profile-label">Current Plan</span>
              <p>{user.plan}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;