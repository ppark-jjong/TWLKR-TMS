// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthService from '../services/AuthService';
import { useNavigate } from 'react-router-dom'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); 

  useEffect(() => {
    // 초기 사용자 정보 로드
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

// AuthContext.js
const login = async (userId, password) => {
  const response = await AuthService.login(userId, password);
  const { token, user } = response;
  localStorage.setItem('access_token', token.access_token);
  localStorage.setItem('refresh_token', token.refresh_token);
  localStorage.setItem('user', JSON.stringify(user));
  setUser(user);
  return response;
};

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);