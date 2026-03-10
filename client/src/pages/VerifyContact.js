import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaPaperPlane, FaRedo } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const VerifyContact = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, verifyContact, sendVerificationCode } = useAuth();

  const initialState = location.state || {};
  const [email, setEmail] = useState(initialState.email || '');
  const [code, setCode] = useState('');
  const [verificationMessage, setVerificationMessage] = useState(initialState.verificationMessage || '');
  const [devCode, setDevCode] = useState(initialState.devVerificationCode || '');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!email.trim() || !code.trim()) {
      toast.error('Email and verification code are required');
      return;
    }

    setSubmitting(true);
    const result = await verifyContact(email.trim(), code.trim());
    setSubmitting(false);

    if (result.success) {
      toast.success(result.data?.message || 'Verification successful');
      navigate('/');
      return;
    }

    toast.error(result.error || 'Verification failed');
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email first');
      return;
    }

    setResending(true);
    const result = await sendVerificationCode(email.trim());
    setResending(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to resend code');
      return;
    }

    const response = result.data || {};
    setVerificationMessage(response.message || 'Verification code sent');
    setDevCode(response.devVerificationCode || '');
    toast.success(response.message || 'Verification code sent');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Verify Your Account</h2>
          <p>Enter the code sent to your email to activate login.</p>
        </div>

        {verificationMessage && (
          <div className="verification-message">{verificationMessage}</div>
        )}

        {devCode && (
          <div className="dev-code-box">
            <p className="dev-code-title">Dev verification code</p>
            <div className="dev-code-value">{devCode}</div>
          </div>
        )}

        <form onSubmit={handleVerify} className="auth-form" autoComplete="off">
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your registered email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">
              <FaLock className="input-icon" />
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter verification code"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Verifying...' : <>Verify Account <FaPaperPlane /></>}
          </button>

          <button
            type="button"
            className="auth-btn secondary"
            disabled={resending}
            onClick={handleResend}
          >
            {resending ? 'Sending...' : <>Resend Code <FaRedo /></>}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/register" className="auth-link">Create account</Link> or
            <Link to="/login" className="auth-link"> sign in</Link>.
          </p>
        </div>
      </div>

      <div className="auth-sidebar">
        <div className="sidebar-content">
          <h3>One-time verification</h3>
          <p>
            Verification protects your account and enables full access to orders and updates.
          </p>
          <div className="sidebar-features">
            <div className="feature"><span className="feature-dot"></span>Secure code expiry window</div>
            <div className="feature"><span className="feature-dot"></span>Email delivery only</div>
            <div className="feature"><span className="feature-dot"></span>Instant access after verification</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyContact;
