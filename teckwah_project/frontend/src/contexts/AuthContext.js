// src/contexts/AuthContext.js (수정)
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from '../services/AuthService';
import TokenManager from '../utils/TokenManager';
import MessageService from '../utils/MessageService';
import { MessageKeys } from '../utils/Constants';

/**
 * 간소화된 인증 컨텍스트
 */
const AuthContext = createContext(null);

/**
 * 인증 컨텍스트 제공자 컴포넌트
 */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 상태 관리
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  /**
   * 인증 상태 초기화
   */
  const initializeAuth = useCallback(async () => {
    setAuthChecking(true);

    try {
      // 저장된 사용자 정보 확인
      const savedUser = AuthService.getCurrentUser();

      if (savedUser) {
        // 토큰 유효성 검증
        const isValid = await AuthService.checkSession();

        if (isValid) {
          // 세션이 유효하면 사용자 설정
          setUser(savedUser);
        } else {
          // 세션이 유효하지 않으면 인증 데이터 초기화
          AuthService.clearAuthData();
          setUser(null);

          // 로그인 페이지로 리디렉션 (로그인 페이지가 아닌 경우)
          if (location.pathname !== '/login') {
            // 돌아올 URL 저장
            TokenManager.setReturnUrl(location.pathname);

            navigate('/login', { replace: true });
          }
        }
      } else {
        // 저장된 사용자 정보가 없는 경우
        setUser(null);

        // 보호된 경로 접근 시 리디렉션
        const publicPaths = ['/login'];
        if (!publicPaths.includes(location.pathname)) {
          TokenManager.setReturnUrl(location.pathname);
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      console.error('인증 초기화 오류:', error);
      setUser(null);

      // 인증 오류 시 로그인 페이지로 리디렉션
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    } finally {
      setAuthChecking(false);
      setLoading(false);
    }
  }, [location.pathname, navigate]);

  // 초기 인증 상태 확인
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * 로그인 함수
   */
  const login = async (userId, password) => {
    try {
      setLoading(true);

      MessageService.loading('로그인 중...', MessageKeys.AUTH.LOGIN);

      const response = await AuthService.login(userId, password);

      // 사용자 정보 설정
      if (response && response.user) {
        setUser(response.user);
      }

      // 저장된 returnUrl이 있으면 해당 위치로, 없으면 권한별 기본 경로로
      const returnUrl = AuthService.getReturnUrl();
      navigate(
        returnUrl ||
          (response.user.user_role === 'ADMIN' ? '/admin' : '/dashboard')
      );
      AuthService.clearReturnUrl();

      MessageService.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
      return response;
    } catch (error) {
      console.error('로그인 실패:', error);

      // 에러 메시지 표시
      MessageService.error(
        error.message || '로그인에 실패했습니다',
        MessageKeys.AUTH.LOGIN
      );

      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로그아웃 함수
   */
  const logout = async () => {
    try {
      setLoading(true);
      MessageService.loading('로그아웃 중...', MessageKeys.AUTH.LOGOUT);

      // 서버 로그아웃 요청
      await AuthService.logout();

      // 상태 초기화
      setUser(null);

      // 메시지 표시
      MessageService.success('로그아웃되었습니다', MessageKeys.AUTH.LOGOUT);

      // 로그인 페이지로 이동
      navigate('/login', { replace: true });

      return true;
    } catch (error) {
      console.error('로그아웃 실패:', error);

      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      setUser(null);

      // 로그인 페이지로 이동
      navigate('/login', { replace: true });

      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 인증 재시도
   */
  const retryAuth = async () => {
    setAuthChecking(true);
    try {
      // 리프레시 토큰으로 복구 시도
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        const response = await AuthService.refreshToken(refreshToken);
        if (response && response.token) {
          // 사용자 정보 복구
          if (response.user) {
            setUser(response.user);
          } else {
            // 저장된 사용자 정보 활용
            const savedUser = AuthService.getCurrentUser();
            if (savedUser) {
              setUser(savedUser);
            }
          }

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('인증 복구 실패:', error);
      return false;
    } finally {
      setAuthChecking(false);
    }
  };

  // 컨텍스트에 제공할 값
  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.user_role === 'ADMIN',
    authChecking,
    loading,
    retryAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Auth 컨텍스트 사용을 위한 커스텀 훅
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
