// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthService from '../services/AuthService';
import message from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { MessageKeys } from '../utils/message';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 페이지로 리디렉션하는 헬퍼 함수
  const handleRedirectToLogin = (errorMessage) => {
    // 이미 로그인 페이지에 있다면 리디렉션하지 않음
    if (location.pathname === '/login') {
      return;
    }

    // 현재 URL 저장
    localStorage.setItem('returnUrl', location.pathname);

    // 에러 메시지가 있으면 표시
    if (errorMessage) {
      message.warning(errorMessage, MessageKeys.AUTH.SESSION_EXPIRED);
    }

    // 로그인 페이지로 강제 이동
    navigate('/login', { replace: true });
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        setAuthChecking(true);
        setAuthError(null);

        // 현재 인증 정보 확인
        const currentUser = AuthService.getCurrentUser();
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        // 인증 정보가 없는 경우
        if (!currentUser || !token) {
          console.log('인증 정보 없음:', { currentUser, hasToken: !!token });

          // 리프레시 토큰이 있으면 토큰 갱신 시도
          if (refreshToken) {
            try {
              console.log('리프레시 토큰으로 인증 시도');
              const response = await AuthService.refreshToken(refreshToken);

              if (response && response.token) {
                // 갱신 성공 시 사용자 정보 설정
                localStorage.setItem(
                  'access_token',
                  response.token.access_token
                );
                localStorage.setItem(
                  'refresh_token',
                  response.token.refresh_token
                );

                // 갱신된 사용자 정보가 있으면 설정
                if (response.user && isMounted) {
                  localStorage.setItem('user', JSON.stringify(response.user));
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
          // 토큰이 있으면 세션 유효성 확인
          try {
            await axios.get('/auth/check-session', {
              headers: { Authorization: `Bearer ${token}` },
            });
            console.log('세션 확인 성공');
            if (isMounted) setUser(currentUser);
          } catch (sessionError) {
            console.log('세션 확인 실패, 토큰 갱신 시도:', sessionError);

            // 세션 확인 실패 시 리프레시 토큰으로 갱신 시도
            if (refreshToken) {
              try {
                const response = await AuthService.refreshToken(refreshToken);
                if (response && response.token) {
                  localStorage.setItem(
                    'access_token',
                    response.token.access_token
                  );
                  localStorage.setItem(
                    'refresh_token',
                    response.token.refresh_token
                  );
                  if (isMounted) setUser(currentUser);
                  console.log('토큰 갱신 성공');
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
              // 리프레시 토큰이 없으면 로그인 페이지로 이동
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
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          AuthService.clearAuthData();
          handleRedirectToLogin('인증 초기화 중 오류가 발생했습니다.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthChecking(false);
        }
      }
    };

    initAuth();

    // 컴포넌트 언마운트 시 정리
    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname]);

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

    // 이벤트 리스너 등록
    window.addEventListener('storage', handleStorageChange);

    // 정리
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, navigate, location.pathname]);

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
      const returnUrl = localStorage.getItem('returnUrl');
      const redirectTo =
        returnUrl ||
        (response.user.user_role === 'ADMIN' ? '/admin' : '/dashboard');
      localStorage.removeItem('returnUrl');

      navigate(redirectTo);
      message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
      return response;
    } catch (error) {
      // ErrorHandler를 통한 일관된 에러 처리
      console.error('로그인 실패:', error);
      setAuthError(
        error.response?.data?.detail || '로그인 중 오류가 발생했습니다'
      );
      ErrorHandler.handle(error, 'login');
      throw error;
    }
  };

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

  // 인증 데이터 초기화 및 리디렉트 헬퍼 함수
  const resetAuthAndRedirect = () => {
    AuthService.clearAuthData();
    setUser(null);
    setAuthError(null);
    handleRedirectToLogin('인증 정보가 초기화되었습니다.');
  };

  // 인증 오류 복구 시도 함수
  const retryAuth = async () => {
    setAuthChecking(true);
    try {
      // 리프레시 토큰으로 복구 시도
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const response = await AuthService.refreshToken(refreshToken);
        if (response && response.token) {
          localStorage.setItem('access_token', response.token.access_token);
          localStorage.setItem('refresh_token', response.token.refresh_token);

          // 사용자 정보 복구
          if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user);
          } else {
            // 저장된 사용자 정보 활용
            const savedUser = JSON.parse(
              localStorage.getItem('user') || 'null'
            );
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

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        authChecking,
        authError,
        resetAuthAndRedirect,
        retryAuth,
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
