import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      
      // Skip auth check if returning from OAuth callback
      if (window.location.hash?.includes('session_id=')) {
        setLoading(false);
        return;
      }

      // Check for stored session token
      const storedToken = localStorage.getItem('session_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      // If token is invalid, clear it
      localStorage.removeItem('session_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setUser(response.data.user);
    localStorage.setItem('session_token', response.data.session_token);
    return response.data;
  };

  const register = async (email, name, password, role, phone) => {
    const response = await axios.post(`${API}/auth/register`, { email, name, password, role, phone });
    setUser(response.data.user);
    localStorage.setItem('session_token', response.data.session_token);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem('session_token');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
