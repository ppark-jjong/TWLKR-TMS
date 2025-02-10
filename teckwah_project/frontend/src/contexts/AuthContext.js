// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

// 메모리 기반 토큰 저장소
const tokenStore = {
  accessToken: null,
  refreshToken: null,
  user: null
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(tokenStore.user);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshToken = useCallback(async () => {
    try {
      if (!tokenStore.refreshToken) return false;

      const response = await authService.refreshToken(tokenStore.refreshToken);
      
      if (response.access_token) {
        tokenStore.accessToken = response.access_token;
        return true;
      }
      return false;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      return false;
    }
  }, []);

  // 초기 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      if (tokenStore.refreshToken) {
        const success = await refreshToken();
        if (!success) {
          tokenStore.accessToken = null;
          tokenStore.refreshToken = null;
          tokenStore.user = null;
          setUser(null);
          if (!location.pathname.startsWith('/login')) {
            navigate('/login');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [navigate, location, refreshToken]);

  const login = async (userId, password) => {
    try {
      const response = await authService.login(userId, password);
      const { access_token, refresh_token, user: userData } = response;

      tokenStore.accessToken = access_token;
      tokenStore.refreshToken = refresh_token;
      tokenStore.user = userData;

      setUser(userData);
      navigate('/dashboard');
      return true;
    } catch (error) {
      console.error('로그인 실패:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (tokenStore.refreshToken) {
        await authService.logout(tokenStore.refreshToken);
      }
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    } finally {
      tokenStore.accessToken = null;
      tokenStore.refreshToken = null;
      tokenStore.user = null;
      setUser(null);
      navigate('/login');
    }
  };

  // API 인터셉터에서 사용할 토큰 접근자
  const getAccessToken = () => tokenStore.accessToken;
  const getRefreshToken = () => tokenStore.refreshToken;

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    getAccessToken,
    getRefreshToken,
    refreshToken
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}