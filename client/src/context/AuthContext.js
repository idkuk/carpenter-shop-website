import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const persistSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('role', user.role || '');
  localStorage.setItem('name', user.name || '');
  localStorage.setItem('email', user.email || '');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await authService.getMe();
        if (mounted) {
          setUser(response.user || null);
        }
      } catch (error) {
        authService.logout();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.token && response.user) {
        persistSession(response.token, response.user);
        setUser(response.user);
      }
      return { success: true, data: response };
    } catch (error) {
      const responseData = error.response?.data;
      return {
        success: false,
        error: responseData?.message || 'Login failed',
        requiresVerification: responseData?.requiresVerification || false,
        email: responseData?.email,
        verificationChannel: responseData?.verificationChannel || 'email',
        verificationMessage: responseData?.verificationMessage || '',
        devVerificationCode: responseData?.devVerificationCode
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const sendVerificationCode = async (email) => {
    try {
      const response = await authService.sendVerificationCode(email);
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send verification code'
      };
    }
  };

  const verifyContact = async (email, code) => {
    try {
      const response = await authService.verifyContact(email, code);
      if (response.token && response.user) {
        persistSession(response.token, response.user);
        setUser(response.user);
      }
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Verification failed'
      };
    }
  };

  const logout = async () => {
    authService.logout();
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    sendVerificationCode,
    verifyContact,
    logout,
    isAuthenticated: !!user
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
