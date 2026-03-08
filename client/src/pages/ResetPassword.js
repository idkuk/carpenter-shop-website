import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaLock, FaArrowLeft, FaKey } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authService } from '../services/api';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    token: searchParams.get('token') || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.token.trim()) {
      toast.error('Reset token is required');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword(formData.token.trim(), formData.password);
      toast.success(response.message || 'Password reset successful');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create a New Password</h2>
          <p>Enter your reset token and choose a new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
          <div className="form-group">
            <label htmlFor="token">
              <FaKey className="input-icon" />
              Reset Token
            </label>
            <input
              type="text"
              id="token"
              name="token"
              value={formData.token}
              onChange={handleChange}
              placeholder="Paste your reset token"
              required
              autoComplete="one-time-code"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter a new password"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaLock className="input-icon" />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your new password"
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="auth-link">
              <FaArrowLeft /> Back to Login
            </Link>
          </p>
        </div>
      </div>

      <div className="auth-sidebar">
        <div className="sidebar-content">
          <div className="sidebar-icon">
            <FaKey />
          </div>
          <h3>Set a strong password</h3>
          <p>
            Use at least 6 characters, and mix letters and numbers
            for better security.
          </p>
          <div className="sidebar-features">
            <div className="feature">
              <span className="feature-dot"></span>
              Token-based secure reset
            </div>
            <div className="feature">
              <span className="feature-dot"></span>
              Works on mobile or desktop
            </div>
            <div className="feature">
              <span className="feature-dot"></span>
              Redirects back to login
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
