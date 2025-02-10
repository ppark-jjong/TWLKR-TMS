import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { CircularProgress } from '@mui/material';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (userId, password) => {
    try {
      const response = await authService.login(userId, password);
      console.log("로그인 응답:", response); // 응답 데이터 확인

      
      if (!response || !response.user) {
        console.error("로그인 응답이 올바르지 않습니다.", response);
        return false;
      }
  
      setUser(response.user);
      navigate('/dashboard');
      return true;
    } catch (error) {
      console.error("로그인 실패:", error);
      return false;
    }
  };
  

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  if (loading) {
    return <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%' }} />;
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
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
