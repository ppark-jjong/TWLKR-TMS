/**
 * 인증 관련 컨텍스트
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { message } from 'antd';
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
  const [authChecked, setAuthChecked] = useState(false); // 인증 확인 완료 여부

  // 초기 인증 상태 확인 (단 한 번만 실행)
  useEffect(() => {
    // 이미 인증 확인을 했거나 로그인 페이지인 경우 세션 체크 건너뛰기
    if (authChecked || isLoginPage()) {
      setIsLoading(false);
      return;
    }

    const checkAuthStatus = async () => {
      try {
        const response = await AuthService.getCurrentUser();
        
        if (response.success) {
          setCurrentUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // 인증되지 않은 상태는 정상 케이스
        console.log('사용자 인증 필요');
      } finally {
        setIsLoading(false);
        setAuthChecked(true); // 인증 확인 완료 표시
      }
    };

    checkAuthStatus();
  }, [authChecked]);

  // 로그인 함수
  const login = async (userId, password) => {
    try {
      setIsLoading(true);
      const response = await AuthService.login(userId, password);
      
      if (response.success) {
        setCurrentUser(response.data);
        setIsAuthenticated(true);
        setAuthChecked(true); // 로그인 성공 시 인증 확인 완료 표시
        message.success('로그인 성공');
        return true;
      } else {
        message.error(response.message || '로그인 실패');
        return false;
      }
    } catch (error) {
      message.error('아이디 또는 비밀번호가 올바르지 않습니다');
      return false;
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
      setAuthChecked(false); // 로그아웃 후 인증 상태 재확인 필요
      message.success('로그아웃 되었습니다');
      return true;
    } catch (error) {
      message.error('로그아웃 처리 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 제공할 값
  const value = {
    currentUser,
    isLoading,
    isAuthenticated,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 인증 컨텍스트 사용 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
};
