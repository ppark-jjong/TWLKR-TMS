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
    } catch (error) {
      console.error('인증 초기화 중 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  const value = {
    user,
    loading,
    login: async (userId, password) => {
      try {
        const response = await AuthService.login(userId, password);
        setUser(response.user);
        return response;
      } catch (error) {
        throw error;
      }
    },
    logout: async () => {
      try {
        await AuthService.logout();
        setUser(null);
        navigate('/login');
      } catch (error) {
        console.error('로그아웃 중 오류:', error);
        throw error;
      }
    }
  };

  // 로딩 중일 때 표시할 컴포넌트
  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout,
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