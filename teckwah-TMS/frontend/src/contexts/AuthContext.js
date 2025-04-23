/**
 * 인증 관련 컨텍스트
 * - 로그인, 로그아웃, 세션 관리 기능 제공
 * - 전역 상태로 인증 정보 관리
 */
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { showErrorOnce, showSuccess } from '../services/api';
import { AuthService } from '../services';

// 인증 컨텍스트 생성
const AuthContext = createContext();

// 로그인 페이지인지 확인하는 함수
const isLoginPage = () => {
  return window.location.pathname === '/login';
};

// 인증 컨텍스트 제공자 컴포넌트
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // 세션 상태 확인 함수
  const checkAuthStatus = useCallback(async (silent = false) => {
    try {
      console.log('인증 상태 확인 시작...');
      setIsLoading(true);

      const response = await AuthService.getCurrentUser();
      console.log('인증 확인 응답:', response);

      if (response.success) {
        // 백엔드에서 받은 userRole 값 확인 로그 추가
        console.log('백엔드에서 받은 사용자 권한:', response.data.userRole);

        // 수정: 불필요한 변환 로직 제거 - 백엔드에서 이미 대문자로 전송됨
        setCurrentUser(response.data);
        setIsAuthenticated(true);
        if (!silent) {
          console.log('세션 유효성 확인 성공');
        }
      } else {
        console.warn('인증 실패:', response.message);
        setCurrentUser(null);
        setIsAuthenticated(false);

        // 로그인 페이지가 아니고 사일런트 모드가 아닌 경우 알림
        if (!isLoginPage() && !silent) {
          showErrorOnce('세션이 만료되었습니다. 다시 로그인해주세요.');
          console.log('로그인 페이지로 이동 중...');
          // 현재 경로를 저장하여 로그인 후 돌아올 수 있게 함
          const currentPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(
            currentPath
          )}`;
        }
      }
    } catch (error) {
      console.warn('사용자 인증 오류:', error);
      setCurrentUser(null);
      setIsAuthenticated(false);

      // 로그인 페이지가 아니고 사일런트 모드가 아닌 경우 알림 및 리다이렉션
      if (!isLoginPage() && !silent) {
        showErrorOnce('인증 확인 중 오류가 발생했습니다. 다시 로그인해주세요.');
        console.log('로그인 페이지로 이동 중...');
        setTimeout(() => {
          // 현재 경로를 저장하여 로그인 후 돌아올 수 있게 함
          const currentPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(
            currentPath
          )}`;
        }, 1000);
      }
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  // 인증 정보 주기적 갱신
  useEffect(() => {
    // 로그인 페이지에서는 주기적 확인 건너뛰기
    if (isLoginPage()) {
      return;
    }

    const refreshInterval = 5 * 60 * 1000; // 5분
    const intervalId = setInterval(() => {
      console.log('세션 자동 갱신 중...');
      checkAuthStatus(true); // 사일런트 모드로 체크
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [checkAuthStatus]);

  // 초기 인증 상태 확인 (컴포넌트 마운트 시 1회)
  useEffect(() => {
    // 로그인 페이지에서는 세션 체크 강제 건너뛰기
    if (isLoginPage()) {
      setIsLoading(false);
      return;
    }

    checkAuthStatus();
  }, [checkAuthStatus]);

  // 로그인 함수
  const login = async (userId, password) => {
    console.log(`로그인 시도: ${userId}`);

    try {
      setIsLoading(true);
      const response = await AuthService.login(userId, password);

      console.log('로그인 응답:', response);

      if (response.success) {
        // 백엔드에서 받은 userRole 값 확인 로그 추가
        console.log('백엔드에서 받은 사용자 권한:', response.data.userRole);

        // 수정: 불필요한 변환 로직 제거 - 백엔드에서 이미 대문자로 전송됨
        setCurrentUser(response.data);
        setIsAuthenticated(true);
        setLastChecked(new Date());

        // 쿠키 확인 (디버깅용)
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find((cookie) =>
          cookie.trim().startsWith('session_id=')
        );
        console.log('세션 쿠키 존재:', !!sessionCookie);

        return {
          success: true,
          message: '로그인 성공',
        };
      } else {
        return {
          success: false,
          message:
            response.message ||
            '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인하세요.',
        };
      }
    } catch (error) {
      console.error('로그인 처리 오류:', error);

      return {
        success: false,
        message:
          '로그인 중 오류가 발생했습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도하세요.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      setIsLoading(true);
      await AuthService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLastChecked(null);

      // 수정: httpOnly 쿠키는 JavaScript에서 접근할 수 없으므로 백엔드에서 처리해야 함
      console.log('로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 처리 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Context를 사용하기 위한 커스텀 훅 제공
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
};

export default AuthContext;