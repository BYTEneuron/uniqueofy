import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext();

// Normalize user object so both 'id' and '_id' are always available,
// regardless of whether the data came from verifyOtp (id) or getMe (_id).
function normalizeUser(u) {
  if (!u) return u;
  return { ...u, id: u.id || u._id, _id: u._id || u.id };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // Initialize from local storage OR attempt refresh via axios interceptor 401 handler
  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(normalizeUser(res.data.data));
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('uniqueofy_access_token');
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  // Listen for session-expired events from axios interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      // Prevent forcing unauthenticated visitors to login on initial page load
      if (!isInitializing) {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [navigate, isInitializing]);

  const sendOtp = useCallback(async (phone) => {
    try {
      await api.post('/auth/send-otp', { phone });
      return { success: true };
    } catch (error) {
      console.error('Send OTP failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to send OTP',
        error: error.response?.data?.error || null,
        status: error.response?.status || null,
        data: error.response?.data?.data || null,
      };
    }
  }, []);

  const verifyOtp = useCallback(async (phone, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp });
      // Backend returns: { success: true, message: '...', data: { accessToken, user } }
      const { accessToken, user: userData } = response.data.data;

      localStorage.setItem('uniqueofy_access_token', accessToken);
      const normalized = normalizeUser(userData);
      setUser(normalized);
      setIsAuthenticated(true);

      return { success: true, user: normalized };
    } catch (error) {
      console.error('Verify OTP failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to verify OTP' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('uniqueofy_access_token');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateUser = useCallback((updatedUser) => {
  setUser(normalizeUser(updatedUser));
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    sendOtp,
    verifyOtp,
    logout,
    updateUser
  }), [user, isAuthenticated, sendOtp, verifyOtp, logout, updateUser]);

  if (isInitializing) {
    return (
      <div className="loading-fallback">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
