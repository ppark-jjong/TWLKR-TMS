// frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 초기 로드 시 로그인 상태 체크
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        try {
          const userData = localStorage.getItem('user');
          setUser(JSON.parse(userData));
        } catch (error) {
          localStorage.clear();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (userId, password) => {
    try {
      const response = await AuthService.login({ user_id: userId, password });
      const { access_token, refresh_token, user: userData } = response;
      
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
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
      const refreshToken = localStorage.getItem('refreshToken');
      await AuthService.logout(refreshToken);
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    } finally {
      localStorage.clear();
      setUser(null);
      navigate('/login');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
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