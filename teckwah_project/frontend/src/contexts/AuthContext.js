// src/contexts/AuthContext.js
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from '../services/AuthService';
import TokenManager from '../utils/TokenManager';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { useLogger } from '../utils/LogUtils';

/**
 * 인증 컨텍스트
 * 사용자 인증 상태 및 관련 기능 제공
 */
const AuthContext = createContext(null);

/**
 * 인증 컨텍스트 제공자 컴포넌트
 * 인증 관련 상태와 함수를 제공
 */
export const AuthProvider = ({ children }) => {
  const logger = useLogger('AuthContext');
  const navigate = useNavigate();
  const location = useLocation();

  // 상태 관리
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 토큰 갱신 타이머 ref
  const refreshTimerRef = useRef(null);

  /**
   * 로그인 페이지로 리디렉션
   * @param {string} message - 표시할 메시지
   */
  const handleRedirectToLogin = useCallback(
    (messageText) => {
      // 현재 경로가 로그인 페이지가 아닐 경우에만 리디렉션
      if (location.pathname !== '/login') {
        // 돌아올 URL 저장
        TokenManager.setReturnUrl(location.pathname);

        // 메시지 표시
        if (messageText) {
          message.warning(messageText, MessageKeys.AUTH.SESSION);
        }

        // 로그인 페이지로 리디렉션
        navigate('/login', { replace: true });
      }
    },
    [location.pathname, navigate]
  );

  /**
   * 인증 상태 초기화
   */
  const initializeAuth = useCallback(async () => {
    setAuthChecking(true);

    try {
      logger.info('인증 상태 초기화 시작');

      // 저장된 사용자 정보 확인
      const savedUser = AuthService.getCurrentUser();

      if (savedUser) {
        // 토큰 유효성 검증
        const isValid = await AuthService.checkSession();

        if (isValid) {
          // 세션이 유효하면 사용자 설정
          setUser(savedUser);
          setAuthError(null);

          // 토큰 자동 갱신 타이머 설정
          setupTokenRefreshTimer();

          logger.info('인증 상태 초기화 성공:', savedUser.user_id);
        } else {
          // 세션이 유효하지 않으면 인증 데이터 초기화
          AuthService.clearAuthData();
          setUser(null);
          setAuthError('인증 세션이 만료되었습니다');

          logger.warn('토큰이 유효하지 않아 인증 초기화 실패');

          // 로그인 페이지로 리디렉션 (로그인 페이지가 아닌 경우)
          if (location.pathname !== '/login') {
            handleRedirectToLogin(
              '세션이 만료되었습니다. 다시 로그인해주세요.'
            );
          }
        }
      } else {
        // 저장된 사용자 정보가 없는 경우
        setUser(null);
        logger.info('저장된 인증 정보 없음');

        // 보호된 경로 접근 시 리디렉션
        const publicPaths = ['/login'];
        if (!publicPaths.includes(location.pathname)) {
          handleRedirectToLogin();
        }
      }
    } catch (error) {
      logger.error('인증 초기화 오류:', error);
      setUser(null);
      setAuthError('인증 초기화 중 오류가 발생했습니다');

      // 인증 오류 시 로그인 페이지로 리디렉션
      if (location.pathname !== '/login') {
        handleRedirectToLogin('인증 오류가 발생했습니다. 다시 로그인해주세요.');
      }
    } finally {
      setAuthChecking(false);
      setLoading(false);
    }
  }, [
    location.pathname,
    handleRedirectToLogin,
    logger,
    setupTokenRefreshTimer,
  ]);

  // 토큰 자동 갱신 타이머 설정
  const setupTokenRefreshTimer = useCallback(() => {
    // 기존 타이머가 있으면 제거
    if (refreshTimerRef.current) {
      AuthService.clearRefreshTimer(refreshTimerRef.current);
    }

    // 새 타이머 설정
    refreshTimerRef.current = AuthService.setupRefreshTimer(
      // 타이머 ID
      'auth-context',

      // 갱신 성공 시
      (result) => {
        if (result.user) {
          setUser(result.user);
          logger.debug('토큰 자동 갱신 성공');
        }
      },

      // 갱신 실패 시
      (error) => {
        logger.error('토큰 자동 갱신 실패:', error);

        // 인증 오류인 경우 로그인 페이지로 리디렉션
        if (ErrorHandler.isAuthenticationError(error)) {
          AuthService.clearAuthData();
          setUser(null);
          setAuthError('세션이 만료되었습니다. 다시 로그인해주세요.');
          handleRedirectToLogin('세션이 만료되었습니다. 다시 로그인해주세요.');
        }
      }
    );
  }, [handleRedirectToLogin, logger]);

  // 초기 인증 상태 확인
  useEffect(() => {
    initializeAuth();

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (refreshTimerRef.current) {
        AuthService.clearRefreshTimer(refreshTimerRef.current);
      }
    };
  }, [initializeAuth]);

  // 다른 탭에서 로그아웃 했을 때 동기화
  useEffect(() => {
    // localStorage 이벤트 핸들러 - 다른 탭에서 토큰 변경 감지
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

    // auth-status-change 이벤트 핸들러 - 인증 상태 변경 감지
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
      logger.info('로그인 요청:', userId);
      setAuthError(null);
      setLoading(true);

      message.loading('로그인 중...', MessageKeys.AUTH.LOGIN);

      const response = await AuthService.login(userId, password);
      logger.debug('로그인 응답 구조:', response);

      // 사용자 정보 설정
      if (response && response.user) {
        setUser(response.user);

        // 자동 갱신 타이머 설정
        setupTokenRefreshTimer();
      } else {
        logger.error('로그인 응답에 사용자 정보가 없습니다:', response);
        throw new Error('로그인 응답 형식이 올바르지 않습니다');
      }

      // 저장된 returnUrl이 있으면 해당 위치로, 없으면 권한별 기본 경로로
      const returnUrl = AuthService.getReturnUrl();
      navigate(
        returnUrl ||
          (response.user.user_role === 'ADMIN' ? '/admin' : '/dashboard')
      );
      AuthService.clearReturnUrl();

      message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
      return response;
    } catch (error) {
      logger.error('로그인 실패:', error);
      setAuthError(
        error.response?.data?.error?.detail ||
          error.response?.data?.message ||
          '로그인 중 오류가 발생했습니다'
      );

      // 에러 처리
      const processedError = ErrorHandler.handle(error, 'login');

      // 로딩 상태 해제
      setLoading(false);

      throw processedError;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로그아웃 함수
   * @returns {Promise} - 로그아웃 결과
   */
  const logout = async () => {
    message.loading('로그아웃 중...', MessageKeys.AUTH.LOGOUT);
    try {
      setLoading(true);

      // 타이머 정리
      if (refreshTimerRef.current) {
        AuthService.clearRefreshTimer(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      // 서버 로그아웃 요청
      await AuthService.logout();

      // 상태 초기화
      setUser(null);
      setAuthError(null);

      // 메시지 표시
      message.success('로그아웃되었습니다', MessageKeys.AUTH.LOGOUT);

      // 브라우저 주소 이력 초기화를 위해 replace: true 옵션 사용
      navigate('/login', { replace: true });

      return true;
    } catch (error) {
      logger.error('로그아웃 실패:', error);

      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      setUser(null);
      setAuthError(null);

      // 에러 처리
      ErrorHandler.handle(error, 'logout');

      // 로그인 페이지로 이동
      navigate('/login', { replace: true });

      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 인증 상태 초기화 및 로그인 페이지로 리디렉션
   * 강제 로그아웃이 필요한 상황에서 사용
   */
  const resetAuthAndRedirect = useCallback(() => {
    // 타이머 정리
    if (refreshTimerRef.current) {
      AuthService.clearRefreshTimer(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // 인증 데이터 정리
    AuthService.clearAuthData();

    // 상태 초기화
    setUser(null);
    setAuthError(null);

    // 로그인 페이지로 리디렉션
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
        logger.info('인증 재시도: 토큰 갱신 시도');

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

          // 자동 갱신 타이머 다시 설정
          setupTokenRefreshTimer();

          setAuthError(null);
          message.success('인증이 복구되었습니다');
          return true;
        }
      }

      logger.warn('인증 재시도 실패: 유효한 리프레시 토큰 없음');
      return false;
    } catch (error) {
      logger.error('인증 복구 실패:', error);
      return false;
    } finally {
      setAuthChecking(false);
    }
  };

  /**
   * 권한 검증 함수
   * @param {string} requiredRole - 필요한 권한
   * @returns {boolean} - 권한 충족 여부
   */
  const verifyPermission = useCallback((requiredRole) => {
    return AuthService.verifyPermission(requiredRole);
  }, []);

  // 컨텍스트에 제공할 값
  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.user_role === 'ADMIN',
    authChecking,
    authError,
    loading,
    resetAuthAndRedirect,
    retryAuth,
    verifyPermission,
  };

  // 로딩 중 표시를 위한 컴포넌트
  if (loading && authChecking) {
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
