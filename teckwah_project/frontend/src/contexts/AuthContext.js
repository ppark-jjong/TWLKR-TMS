// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import axios from 'axios';
import AuthService from '../services/AuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 초기 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = AuthService.getCurrentUser();

        if (!currentUser) {
          // 로그인 페이지가 아닌 경우에만 리다이렉트
          if (location.pathname !== '/login') {
            localStorage.setItem('returnUrl', location.pathname);
            navigate('/login');
          }
          return;
        }

        // 세션 유효성 확인
        try {
          // 백엔드에서 세션 체크 (401 응답 시 자동으로 refresh 시도)
          await axios.get('/auth/check-session', { withCredentials: true });
          setUser(currentUser);
        } catch (error) {
          // 세션 체크 실패 시 (refresh 실패 포함) 로그인 페이지로
          AuthService.clearAuthData();
          if (location.pathname !== '/login') {
            localStorage.setItem('returnUrl', location.pathname);
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        AuthService.clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate, location.pathname]);

  const login = async (userId, password) => {
    try {
      const response = await AuthService.login(userId, password);
      setUser(response.user);

      // 저장된 returnUrl이 있으면 해당 위치로, 없으면 대시보드로
      const returnUrl = localStorage.getItem('returnUrl');
      const redirectTo = returnUrl || '/dashboard';
      localStorage.removeItem('returnUrl');

      navigate(redirectTo);
      message.success('로그인되었습니다');
      return response;
    } catch (error) {
      message.error(
        error.response?.data?.detail || '로그인 중 오류가 발생했습니다'
      );
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      message.success('로그아웃되었습니다');
      navigate('/login');
    } catch (error) {
      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      setUser(null);
      message.error('로그아웃 중 오류가 발생했습니다');
      navigate('/login');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
