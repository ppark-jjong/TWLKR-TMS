import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../utils/Api';

// 인증 컨텍스트 생성
const AuthContext = createContext(null);

// 인증 제공자 컴포넌트
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // 로그인 함수
  const login = async (credentials) => {
    try {
      setError(null);
      const response = await apiService.auth.login(credentials);

      if (response.success) {
        // 액세스 토큰 저장
        localStorage.setItem('access_token', response.data.access_token);
        setUser(response.data.user);
        return response.data.user;
      } else {
        setError(response.message);
        return null;
      }
    } catch (err) {
      setError(err.response?.data?.message || '로그인 중 오류가 발생했습니다');
      return null;
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (err) {
      console.error('로그아웃 중 오류:', err);
    } finally {
      // 로컬 상태 초기화
      localStorage.removeItem('access_token');
      setUser(null);
      navigate('/login');
    }
  };

  // 현재 사용자 정보 로드
  const loadUser = async () => {
    if (!localStorage.getItem('access_token')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.auth.getCurrentUser();

      if (response.success) {
        setUser(response.data.user);
      } else {
        // 토큰이 유효하지 않은 경우
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } catch (err) {
      console.error('사용자 정보 로드 중 오류:', err);
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 현재 사용자가 관리자인지 확인
  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 컨텍스트 값
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 인증 컨텍스트 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
