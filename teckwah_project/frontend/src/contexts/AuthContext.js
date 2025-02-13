// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import AuthService from '../services/AuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 사용자 인증 상태 초기화
  const initializeAuth = useCallback(async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else if (location.pathname !== '/login') {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const loginUser = async (userId, password) => {
    try {
      const response = await AuthService.login(userId, password);
      setUser(response.user);
      message.success('로그인되었습니다');
      navigate('/dashboard');
      return response;
    } catch (error) {
      message.error(error.response?.data?.detail || '로그인 중 오류가 발생했습니다');
      throw error;
    }
  };

  const logoutUser = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      message.success('로그아웃되었습니다');
      navigate('/login');
    } catch (error) {
      message.error('로그아웃 중 오류가 발생했습니다');
      throw error;
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user,
        login: loginUser,
        logout: logoutUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
};