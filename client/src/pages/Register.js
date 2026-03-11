import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaLock, FaMapMarkerAlt, FaPhone, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { user, loading, register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    const result = await register({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      password: formData.password
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Registration failed');
      return;
    }

    const response = result.data || {};
    toast.success(response.message || 'Registration successful');

    navigate('/verify-contact', {
      state: {
        email: response.email || formData.email.trim(),
        verificationMessage: response.message || 'Verification code sent.',
        devVerificationCode: response.devVerificationCode
      }
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Register as a customer and verify your contact to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
          <div className="form-group">
            <label htmlFor="name">
              <FaUser className="input-icon" />
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

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
            <label htmlFor="phone">
              <FaPhone className="input-icon" />
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">
              <FaMapMarkerAlt className="input-icon" />
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your address"
              autoComplete="street-address"
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
              autoComplete="new-password"
              required
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
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link to="/login" className="auth-link">
              <FaArrowLeft /> Back to Login
            </Link>
          </p>
        </div>
      </div>

      <div className="auth-sidebar">
        <div className="sidebar-content">
          <h3>WoodWork Hub customer portal</h3>
          <p>
            Place custom orders, track progress, and stay updated from one dashboard.
          </p>
          <div className="sidebar-features">
            <div className="feature"><span className="feature-dot"></span>Custom furniture requests</div>
            <div className="feature"><span className="feature-dot"></span>Order timeline visibility</div>
            <div className="feature"><span className="feature-dot"></span>Email verification support</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
