// frontend/src/contexts/AuthContext.js - 리팩토링 버전
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from '../services/AuthService';
import message from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { MessageKeys } from '../utils/message';
import TokenManager from '../utils/TokenManager';

// AuthContext 생성
const AuthContext = createContext(null);

/**
 * 인증 컨텍스트 제공자 컴포넌트
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 페이지로 리디렉션하는 헬퍼 함수
  const handleRedirectToLogin = useCallback(
    (errorMessage) => {
      // 이미 로그인 페이지에 있다면 리디렉션하지 않음
      if (location.pathname === '/login') {
        return;
      }

      // 현재 URL 저장
      AuthService.saveReturnUrl(location.pathname);

      // 에러 메시지가 있으면 표시
      if (errorMessage) {
        message.warning(errorMessage, MessageKeys.AUTH.SESSION_EXPIRED);
      }

      // 로그인 페이지로 강제 이동
      navigate('/login', { replace: true });
    },
    [navigate, location.pathname]
  );

  // 세션 상태 초기화 및 검증
  const initializeAuth = useCallback(async () => {
    let isMounted = true;

    try {
      setAuthChecking(true);
      setAuthError(null);

      // 현재 인증 정보 확인
      const currentUser = AuthService.getCurrentUser();
      const token = TokenManager.getAccessToken();

      // 인증 정보가 없는 경우
      if (!currentUser || !token) {
        console.log('인증 정보 없음:', { currentUser, hasToken: !!token });

        // 리프레시 토큰으로 자동 로그인 시도
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            console.log('리프레시 토큰으로 인증 시도');
            const response = await AuthService.refreshToken(refreshToken);

            if (response && response.token) {
              // 갱신 성공 시 사용자 정보 설정
              if (response.user && isMounted) {
                setUser(response.user);
                console.log('토큰 갱신 성공');
              } else if (isMounted) {
                // 사용자 정보가 없으면 기존 정보 유지
                setUser(currentUser);
              }
            } else {
              throw new Error('토큰 갱신 실패: 응답 형식 오류');
            }
          } catch (refreshError) {
            console.error('토큰 갱신 실패:', refreshError);
            if (isMounted) {
              AuthService.clearAuthData();
              setAuthError('세션이 만료되었습니다. 다시 로그인해주세요.');
              handleRedirectToLogin(
                '세션이 만료되었습니다. 다시 로그인해주세요.'
              );
            }
            return;
          }
        } else {
          // 리프레시 토큰도 없으면 로그인 페이지로 이동
          if (isMounted && location.pathname !== '/login') {
            handleRedirectToLogin();
          }
          return;
        }
      } else {
        // 세션 유효성 확인
        const isSessionValid = await AuthService.checkSession();

        if (isSessionValid) {
          if (isMounted) setUser(currentUser);
        } else {
          console.log('세션 무효: 로그인 페이지로 리디렉션');
          if (isMounted) {
            AuthService.clearAuthData();
            setAuthError('세션이 만료되었습니다. 다시 로그인해주세요.');
            handleRedirectToLogin(
              '세션이 만료되었습니다. 다시 로그인해주세요.'
            );
          }
          return;
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      if (isMounted) {
        AuthService.clearAuthData();
        setAuthError('인증 초기화 중 오류가 발생했습니다.');
        handleRedirectToLogin('인증 초기화 중 오류가 발생했습니다.');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
        setAuthChecking(false);
      }
    }

    // 컴포넌트 언마운트 시 실행될 cleanup 함수
    return () => {
      isMounted = false;
    };
  }, [handleRedirectToLogin, location.pathname]);

  // 초기 인증 상태 확인
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 다른 탭에서 로그아웃 했을 때 동기화
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'access_token' && !event.newValue && user) {
        // 다른 탭에서 로그아웃 했을 때
        setUser(null);
        if (location.pathname !== '/login') {
          message.warning('다른 탭에서 로그아웃되었습니다');
          navigate('/login', { replace: true });
        }
      }
    };

    // auth-status-change 이벤트 핸들러
    const handleAuthStatusChange = () => {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser && user) {
        // 인증 상태가 변경됨 (로그아웃)
        setUser(null);
        if (location.pathname !== '/login') {
          message.warning('로그아웃되었습니다');
          navigate('/login', { replace: true });
        }
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-status-change', handleAuthStatusChange);

    // 정리
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-status-change', handleAuthStatusChange);
    };
  }, [user, navigate, location.pathname]);

  /**
   * 로그인 함수
   * @param {string} userId - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise} - 로그인 결과
   */
  const login = async (userId, password) => {
    try {
      console.log('로그인 요청:', userId);
      setAuthError(null);

      const response = await AuthService.login(userId, password);
      console.log('로그인 응답 구조:', response);

      // 사용자 정보 설정
      if (response && response.user) {
        setUser(response.user);
      } else {
        console.error('로그인 응답에 사용자 정보가 없습니다:', response);
        throw new Error('로그인 응답 형식이 올바르지 않습니다');
      }

      // 저장된 returnUrl이 있으면 해당 위치로, 없으면 대시보드로
      const returnUrl = AuthService.getReturnUrl();
      navigate(returnUrl);
      AuthService.clearReturnUrl();

      message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
      return response;
    } catch (error) {
      console.error('로그인 실패:', error);
      setAuthError(
        error.response?.data?.detail || '로그인 중 오류가 발생했습니다'
      );
      ErrorHandler.handle(error, 'login');
      throw error;
    }
  };

  /**
   * 로그아웃 함수
   * @returns {Promise} - 로그아웃 결과
   */
  const logout = async () => {
    message.loading('로그아웃 중...', MessageKeys.AUTH.LOGOUT);
    try {
      await AuthService.logout();
      setUser(null);
      setAuthError(null);
      message.success('로그아웃되었습니다', MessageKeys.AUTH.LOGOUT);

      // 브라우저 주소 이력 초기화를 위해 replace: true 옵션 사용
      navigate('/login', { replace: true });
    } catch (error) {
      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      console.error('로그아웃 실패:', error);
      setUser(null);
      setAuthError(null);
      ErrorHandler.handle(error, 'logout');
      navigate('/login', { replace: true });
    }
  };

  /**
   * 인증 상태 초기화 및 로그인 페이지로 리디렉션
   * 강제 로그아웃이 필요한 상황에서 사용
   */
  const resetAuthAndRedirect = useCallback(() => {
    AuthService.clearAuthData();
    setUser(null);
    setAuthError(null);
    handleRedirectToLogin('인증 정보가 초기화되었습니다.');
  }, [handleRedirectToLogin]);

  /**
   * 인증 재시도 (토큰 갱신 등)
   * @returns {Promise<boolean>} - 재시도 성공 여부
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

          setAuthError(null);
          message.success('인증이 복구되었습니다');
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

  // 컨텍스트 값
  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    authChecking,
    authError,
    resetAuthAndRedirect,
    retryAuth,
  };

  // 로딩 중 표시를 위한 컴포넌트
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div className="loading-spinner"></div>
        <p>인증 정보 확인 중...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Auth 컨텍스트 사용을 위한 커스텀 훅
 * @returns {Object} - 인증 관련 상태 및 함수들
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
