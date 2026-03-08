import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaEnvelope, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      toast.error('Email and password are required');
      return;
    }

    setSubmitting(true);
    const result = await login(formData.email.trim(), formData.password);
    setSubmitting(false);

    if (result.success) {
      toast.success(result.data?.message || 'Login successful');
      navigate('/dashboard');
      return;
    }

    if (result.requiresVerification) {
      navigate('/verify-contact', {
        state: {
          email: result.email || formData.email.trim(),
          verificationChannel: result.verificationChannel || 'email',
          verificationMessage: result.verificationMessage || result.error,
          devVerificationCode: result.devVerificationCode
        }
      });
      return;
    }

    toast.error(result.error || 'Login failed');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Login to manage your carpenter shop orders.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-options">
            <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Logging in...' : <>Login <FaArrowRight /></>}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?
            <Link to="/register" className="auth-link">Register here</Link>
          </p>
        </div>
      </div>

      <div className="auth-sidebar">
        <div className="sidebar-content">
          <h3>Build custom furniture with confidence</h3>
          <p>
            Track order progress, deadlines, and updates from one place.
          </p>
          <div className="sidebar-features">
            <div className="feature"><span className="feature-dot"></span>Real-time order tracking</div>
            <div className="feature"><span className="feature-dot"></span>Customer and staff workflows</div>
            <div className="feature"><span className="feature-dot"></span>Secure account verification</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
