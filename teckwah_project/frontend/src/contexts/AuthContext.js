// frontend/src/contexts/AuthContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
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
        const token = AuthService.getAccessToken();

        if (currentUser && token) {
          setUser(currentUser);
          // 로그인 페이지가 아닌 곳에서 시작한 경우 returnUrl 저장
          if (location.pathname !== '/login') {
            localStorage.setItem('returnUrl', location.pathname);
          }
        } else {
          // 인증 정보가 없으면 로그인 페이지로
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
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
      localStorage.removeItem('returnUrl'); // 사용 후 삭제

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
      message.error('로그아웃 중 오류가 발생했습니다');
      throw error;
    }
  };

  if (loading) {
    return null; // 또는 로딩 스피너
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
