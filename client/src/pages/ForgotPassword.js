import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft, FaUnlockAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authService } from '../services/api';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetTokenExpiresAt, setResetTokenExpiresAt] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      toast.success(response.message || 'If an account exists, a reset link has been sent.');

      if (response.resetToken) {
        setResetToken(response.resetToken);
        setResetTokenExpiresAt(response.resetTokenExpiresAt || '');
        setResetUrl(response.resetUrl || '');
      } else {
        setResetToken('');
        setResetTokenExpiresAt('');
        setResetUrl('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Your Password</h2>
          <p>Enter your email and we will send you a reset link.</p>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {resetToken && (
          <div className="demo-credentials">
            <p><FaUnlockAlt /> Dev reset token (non-production only)</p>
            <code className="reset-token">{resetToken}</code>
            {resetTokenExpiresAt && (
              <p className="token-expiry">
                Expires: {new Date(resetTokenExpiresAt).toLocaleString()}
              </p>
            )}
            <Link to={resetUrl || `/reset-password?token=${resetToken}`} className="auth-link">
              Continue to reset password
            </Link>
          </div>
        )}

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
            <FaUnlockAlt />
          </div>
          <h3>Forgot your password?</h3>
          <p>
            We will help you regain access to your account securely.
            If you do not see the email, check your spam folder.
          </p>
          <div className="sidebar-features">
            <div className="feature">
              <span className="feature-dot"></span>
              Secure password reset tokens
            </div>
            <div className="feature">
              <span className="feature-dot"></span>
              Tokens expire after a short time
            </div>
            <div className="feature">
              <span className="feature-dot"></span>
              Protects your account privacy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
