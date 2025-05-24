// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  async function checkAuthStatus() {
    try {
      const response = await api.get('/auth/me');
      setCurrentUser(response.data.user);
    } catch (error) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }
  
  async function login(studentId, password) {
    const response = await api.post('/auth/login', { studentId, password });
    setCurrentUser(response.data.user);
    return response.data.user;
  }
  
  async function logout() {
    await api.post('/auth/logout');
    setCurrentUser(null);
  }
  
  const value = {
    currentUser,
    isAdmin: currentUser?.role === 'admin',
    login,
    logout,
    checkAuthStatus
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}