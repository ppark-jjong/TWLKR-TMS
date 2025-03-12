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

      // 로그인 페이지로 강제 이동 - 캐시를 무시하기 위한 타임스탬프 추가
      const redirectUrl = `/login?refresh=${Date.now()}`;
      console.log('인증 만료: 로그인 페이지로 강제 리디렉션', redirectUrl);

      // 현재 실행 중인 코드 완료 후 리다이렉션하도록 setTimeout 사용
      setTimeout(() => {
        window.location.replace(redirectUrl);
      }, 100);
    }
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    // 비동기 초기화 함수를 별도로 정의
    const initAuth = async () => {
      try {
        // 1. 상태 변경 전 초기 설정
        setAuthChecking(true);

        // 2. 모든 변수 먼저, 안전하게 선언 및 초기화
        let currentUser = null;
        let token = null;
        let refreshToken = null;

        try {
          // 각 인증 정보 개별적으로 안전하게 추출
          try {
            currentUser = AuthService.getCurrentUser();
          } catch (e) {
            console.error('사용자 정보 로드 실패:', e);
          }

          try {
            token = localStorage.getItem('access_token');
          } catch (e) {
            console.error('토큰 로드 실패:', e);
          }

          try {
            refreshToken = localStorage.getItem('refresh_token');
          } catch (e) {
            console.error('리프레시 토큰 로드 실패:', e);
          }
        } catch (initError) {
          // 인증 정보 로드 단계에서 예외 발생 시
          console.error('인증 정보 초기화 실패:', initError);
          AuthService.clearAuthData();
          setUser(null);
          setLoading(false);
          setAuthChecking(false);
          handleRedirectToLogin(
            '인증 정보를 불러올 수 없습니다. 다시 로그인해주세요.'
          );
          return;
        }

        // 디버깅 로그 추가
        console.log('인증 초기화 시작:', {
          hasUser: !!currentUser,
          hasToken: !!token,
          hasRefreshToken: !!refreshToken,
          pathname: location.pathname,
        });

        // 3. 인증 정보 없음 - 기본 케이스 먼저 처리
        if (!currentUser && !token && !refreshToken) {
          console.log('인증 정보 없음: 로그인 필요');
          setUser(null);
          setLoading(false);
          setAuthChecking(false);

          // 로그인 페이지가 아닌 경우에만 리다이렉트
          if (location.pathname !== '/login') {
            localStorage.setItem('returnUrl', location.pathname);
            navigate('/login', { replace: true });
          }
          return;
        }

        // 4. 액세스 토큰 검증 - 세션 유효성 확인
        if (token) {
          try {
            // 세션 체크 API 호출
            const sessionResponse = await axios.get('/auth/check-session', {
              headers: { Authorization: `Bearer ${token}` },
            });

            // 응답 구조 확인 로그 추가
            console.log('세션 확인 응답:', sessionResponse.data);

            // 유효한 세션이면 사용자 정보 설정
            if (sessionResponse.data && sessionResponse.data.success) {
              console.log('토큰 유효성 확인 성공');

              // 응답에 사용자 정보가 있으면 이를 우선 사용, 없으면 기존 정보 유지
              const userToSet = sessionResponse.data.user || currentUser;
              if (userToSet && sessionResponse.data.user) {
                localStorage.setItem('user', JSON.stringify(userToSet));
              }

              setUser(userToSet);
              setLoading(false);
              setAuthChecking(false);
              return;
            }
          } catch (sessionError) {
            console.log('토큰 유효성 확인 실패:', sessionError);
            // 세션 체크 실패는 다음 단계(리프레시 토큰)로 진행, 치명적 오류로 취급하지 않음
          }
        }

        // 5. 리프레시 토큰으로 갱신 시도
        if (refreshToken) {
          try {
            console.log('리프레시 토큰으로 인증 시도');
            const response = await AuthService.refreshToken(refreshToken);

            // 명시적 응답 구조 검증
            if (response && response.token) {
              console.log('토큰 갱신 응답:', response);

              // 토큰 저장
              localStorage.setItem('access_token', response.token.access_token);
              if (response.token.refresh_token) {
                localStorage.setItem(
                  'refresh_token',
                  response.token.refresh_token
                );
              }

              // 사용자 정보 설정
              // - 응답에 사용자 정보가 있으면 이를 사용, 없으면 기존 정보 유지
              const userInfo = response.user || currentUser;
              if (userInfo) {
                localStorage.setItem('user', JSON.stringify(userInfo));
                setUser(userInfo);
              } else {
                setUser(currentUser);
              }

              console.log('토큰 갱신 성공');
              setLoading(false);
              setAuthChecking(false);
              return;
            } else {
              // 응답 구조 오류
              throw new Error('토큰 갱신 응답 형식이 올바르지 않습니다');
            }
          } catch (refreshError) {
            // 토큰 갱신 실패 처리
            console.error('토큰 갱신 실패:', refreshError);
            AuthService.clearAuthData();
            setUser(null);

            // 실패 후 로그인 페이지로 리다이렉트
            handleRedirectToLogin(
              '세션이 만료되었습니다. 다시 로그인해주세요.'
            );
            setLoading(false);
            setAuthChecking(false);
            return;
          }
        } else if (!token) {
          // 토큰 없음 - 인증 정보 초기화
          AuthService.clearAuthData();
          setUser(null);

          if (location.pathname !== '/login') {
            handleRedirectToLogin();
          }
        }

        // 예외 케이스: 여기까지 왔다면 인증 정보가 불완전한 상태
        setLoading(false);
        setAuthChecking(false);
      } catch (error) {
        // 전체 초기화 과정 오류 처리
        console.error('인증 초기화 중 오류:', error);
        AuthService.clearAuthData();
        setUser(null);

        // 로그인 페이지로 리다이렉트 (이미 로그인 페이지가 아닌 경우에만)
        handleRedirectToLogin('인증 초기화 중 오류가 발생했습니다.');

        // 항상 로딩 상태 해제
        setLoading(false);
        setAuthChecking(false);
      }
    };

    // 초기화 함수 실행
    initAuth();

    // 다중 탭 환경에서 인증 상태 동기화
    const handleAuthChange = () => {
      console.log('다른 탭에서 인증 상태 변경 감지');
      // 인증 상태 다시 확인
      const currentUser = AuthService.getCurrentUser();
      const token = localStorage.getItem('access_token');

      if (!token || !currentUser) {
        // 토큰 또는 사용자 정보가 없으면 인증 정보 초기화
        setUser(null);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      } else {
        // 토큰과 사용자 정보가 있으면 상태 업데이트
        setUser(currentUser);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('auth-status-change', handleAuthChange);

    // 정리 함수
    return () => {
      window.removeEventListener('auth-status-change', handleAuthChange);
    };
  }, [navigate, location.pathname]);

  const login = async (userId, password) => {
    try {
      console.log('로그인 요청:', userId);

      const response = await AuthService.login(userId, password);
      console.log('로그인 응답 구조:', response);

      // 사용자 정보 검증 및 설정
      if (response && response.user) {
        setUser(response.user);

        // 저장된 returnUrl 확인 및 리다이렉트
        const returnUrl = localStorage.getItem('returnUrl');
        const redirectTo =
          returnUrl ||
          (response.user.user_role === 'ADMIN' ? '/admin' : '/dashboard');

        // returnUrl은 사용 후 삭제
        localStorage.removeItem('returnUrl');

        navigate(redirectTo, { replace: true });
        message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
        return response;
      } else {
        throw new Error('로그인 응답에 사용자 정보가 없습니다');
      }
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

  // 인증 데이터 초기화 및 리다이렉트 헬퍼 함수 추가
  const resetAuthAndRedirect = () => {
    AuthService.clearAuthData();
    setUser(null);
    handleRedirectToLogin('인증 정보가 초기화되었습니다. 다시 로그인해주세요.');
  };

  // 로딩 상태 일관되게 처리
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
        resetAuthAndRedirect, // 새로운 함수 추가
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
