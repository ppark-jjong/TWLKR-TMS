// frontend/src/contexts/AuthContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import AuthService from '../services/AuthService';
import jwt_decode from 'jwt-decode';

const AuthContext = createContext(null);

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5minutes in milliseconds

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const checkTokenExpiration = useCallback((token) => {
    if (!token) return true;
    try {
      const decodedToken = jwt_decode(token);
      return decodedToken.exp * 1000 - Date.now() < TOKEN_REFRESH_THRESHOLD;
    } catch (error) {
      console.error('Token decode error:', error);
      return true;
    }
  }, []);

  const setupRefreshTimer = useCallback((token) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    if (!token) return;

    try {
      const decodedToken = jwt_decode(token);
      const expiryTime = decodedToken.exp * 1000;
      const timeUntilRefresh =
        expiryTime - Date.now() - TOKEN_REFRESH_THRESHOLD;

      if (timeUntilRefresh > 0) {
        refreshTimerRef.current = setTimeout(() => {
          refreshToken();
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.error('Error setting up refresh timer:', error);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (isRefreshing) return;

    const refreshTokenValue = AuthService.getRefreshToken();
    if (!refreshTokenValue) {
      await handleLogout();
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await AuthService.refreshToken(refreshTokenValue);
      AuthService.setTokens(response.access_token, response.refresh_token);
      setupRefreshTimer(response.access_token);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await handleLogout();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      navigate('/login');
    }
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        const token = AuthService.getAccessToken();

        if (currentUser && token) {
          if (checkTokenExpiration(token)) {
            await refreshToken();
          } else {
            setUser(currentUser);
            setupRefreshTimer(token);
          }

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
        await handleLogout();
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
      setupRefreshTimer(response.token.access_token);

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

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return null; // 또는 로딩 스피너
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout: handleLogout,
        refreshToken,
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
