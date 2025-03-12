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
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 페이지로 리디렉션하는 헬퍼 함수
  const handleRedirectToLogin = (errorMessage) => {
    // 로그인 페이지가 아닌 경우에만 리디렉션
    if (location.pathname !== '/login') {
      // 현재 URL 저장
      localStorage.setItem('returnUrl', location.pathname);

      // 에러 메시지가 있으면 표시
      if (errorMessage) {
        message.warning(errorMessage, MessageKeys.AUTH.SESSION_EXPIRED);
      }

      // 로그인 페이지로 강제 이동
      navigate('/login', { replace: true });
    }
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthChecking(true);
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
                if (response.user) {
                  localStorage.setItem('user', JSON.stringify(response.user));
                  setUser(response.user);
                  console.log('토큰 갱신 성공');
                } else {
                  // 사용자 정보가 없으면 기존 정보 유지
                  setUser(currentUser);
                }
              } else {
                throw new Error('토큰 갱신 실패: 응답 형식 오류');
              }
            } catch (refreshError) {
              console.error('토큰 갱신 실패:', refreshError);
              AuthService.clearAuthData();
              handleRedirectToLogin(
                '세션이 만료되었습니다. 다시 로그인해주세요.'
              );
              return;
            }
          } else {
            // 리프레시 토큰도 없으면 로그인 페이지로 이동
            handleRedirectToLogin();
            return;
          }
        } else {
          // 토큰이 있으면 세션 유효성 확인
          try {
            await axios.get('/auth/check-session', {
              headers: { Authorization: `Bearer ${token}` },
            });
            console.log('세션 확인 성공');
            setUser(currentUser);
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
                  setUser(currentUser);
                  console.log('토큰 갱신 성공');
                } else {
                  throw new Error('토큰 갱신 실패: 응답 형식 오류');
                }
              } catch (refreshError) {
                console.error('토큰 갱신 실패:', refreshError);
                AuthService.clearAuthData();
                handleRedirectToLogin(
                  '세션이 만료되었습니다. 다시 로그인해주세요.'
                );
                return;
              }
            } else {
              // 리프레시 토큰이 없으면 로그인 페이지로 이동
              AuthService.clearAuthData();
              handleRedirectToLogin(
                '세션이 만료되었습니다. 다시 로그인해주세요.'
              );
              return;
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        AuthService.clearAuthData();
        handleRedirectToLogin('인증 초기화 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
        setAuthChecking(false);
      }
    };

    initAuth();
  }, [navigate, location.pathname]);

  const login = async (userId, password) => {
    try {
      console.log('로그인 요청:', userId);

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
      ErrorHandler.handle(error, 'login');
      throw error;
    }
  };

  const logout = async () => {
    message.loading('로그아웃 중...', MessageKeys.AUTH.LOGOUT);
    try {
      await AuthService.logout();
      setUser(null);
      message.success('로그아웃되었습니다', MessageKeys.AUTH.LOGOUT);
      navigate('/login', { replace: true });
    } catch (error) {
      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      setUser(null);
      ErrorHandler.handle(error, 'logout');
      navigate('/login', { replace: true });
    }
  };

  // 인증 데이터 초기화 및 리다이렉트 헬퍼 함수
  const resetAuthAndRedirect = () => {
    AuthService.clearAuthData();
    setUser(null);
    handleRedirectToLogin('인증 정보가 초기화되었습니다.');
  };

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
        resetAuthAndRedirect,
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
