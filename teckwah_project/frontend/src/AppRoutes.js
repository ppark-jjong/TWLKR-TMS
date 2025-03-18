// src/AppRoutes.js
import React, { Suspense, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import MainLayout from './components/common/MainLayout';
import { useAuth } from './contexts/AuthContext';
import message from './utils/message';
import { MessageKeys } from './utils/message';
import LoadingSpin from './components/common/LoadingSpin';
import ErrorBoundaryWithFallback from './utils/ErrorBoundaryWithFallback';
import TokenManager from './utils/TokenManager';
import { useLogger } from './utils/LogUtils';
import {
  DashboardPage,
  VisualizationPage,
  LoginPage,
  AdminComponents,
} from './lazyComponents';

/**
 * 애플리케이션 라우팅 컴포넌트
 * 권한 기반 접근 제어 및 라우팅 로직 구현
 */
const AppRoutes = () => {
  const { user, authChecking, isAuthenticated, isAdmin, retryAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const logger = useLogger('AppRoutes');

  // 인증 상태 변경 감지 및 처리
  useEffect(() => {
    // 권한 필요한 경로에 접근할 때 인증 확인
    const currentPath = location.pathname;
    const publicPaths = ['/login'];
    const adminPaths = ['/admin'];

    // 페이지 이동 시 권한 검증
    if (!authChecking && !publicPaths.includes(currentPath)) {
      // 인증되지 않은 경우
      if (!isAuthenticated) {
        logger.warn('인증되지 않은 사용자의 보호된 경로 접근:', currentPath);

        // 인증 재시도
        retryAuth().then((success) => {
          if (!success) {
            // 원래 가려던 경로 저장
            TokenManager.setReturnUrl(currentPath);

            message.warning('로그인이 필요합니다', MessageKeys.AUTH.SESSION);
            navigate('/login', { replace: true });
          }
        });
      }
      // 관리자 경로에 일반 사용자 접근 시
      else if (adminPaths.includes(currentPath) && !isAdmin) {
        logger.warn('일반 사용자의 관리자 경로 접근:', currentPath);
        message.error('관리자 권한이 필요합니다', MessageKeys.AUTH.PERMISSION);
        navigate('/dashboard', { replace: true });
      }
    }
  }, [
    location.pathname,
    isAuthenticated,
    isAdmin,
    authChecking,
    navigate,
    logger,
    retryAuth,
  ]);

  // 지연 로딩 컴포넌트를 위한 Suspense Fallback
  const SuspenseFallback = (
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
      <LoadingSpin tip="컴포넌트 로딩 중..." />
    </div>
  );

  // 인증이 필요한 라우트를 위한 래퍼 컴포넌트
  const PrivateRoute = ({ children, requireAdmin = false }) => {
    if (authChecking) {
      return SuspenseFallback;
    }

    if (!isAuthenticated) {
      // 인증되지 않은 경우 로그인 페이지로 리디렉션
      TokenManager.setReturnUrl(location.pathname);
      logger.info('인증 필요: 로그인 페이지로 리디렉션', location.pathname);
      return <Navigate to="/login" replace />;
    }

    // 관리자 권한이 필요한 라우트에 대한 추가 검증
    if (requireAdmin && !isAdmin) {
      logger.warn('관리자 권한 필요: 대시보드로 리디렉션');
      message.error('관리자 권한이 필요합니다', MessageKeys.AUTH.PERMISSION);
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // 로딩 중일 때 렌더링할 내용
  if (authChecking) {
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
        <LoadingSpin tip="인증 정보 확인 중..." />
      </div>
    );
  }

  return (
    <ErrorBoundaryWithFallback name="라우팅">
      <Routes>
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
            ) : (
              <Suspense fallback={SuspenseFallback}>
                <ErrorBoundaryWithFallback name="로그인 페이지">
                  <LoginPage />
                </ErrorBoundaryWithFallback>
              </Suspense>
            )
          }
        />

        {/* 대시보드 페이지 */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundaryWithFallback name="대시보드 페이지">
                    <DashboardPage />
                  </ErrorBoundaryWithFallback>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* 관리자 페이지 - requireAdmin 속성 추가 */}
        <Route
          path="/admin"
          element={
            <PrivateRoute requireAdmin={true}>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundaryWithFallback name="관리자 페이지">
                    <AdminComponents />
                  </ErrorBoundaryWithFallback>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* 시각화 페이지 */}
        <Route
          path="/visualization"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundaryWithFallback name="시각화 페이지">
                    <VisualizationPage />
                  </ErrorBoundaryWithFallback>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* 기본 경로 - 권한에 따라 리디렉션 */}
        <Route
          path="/"
          element={
            authChecking ? (
              SuspenseFallback
            ) : !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isAdmin ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* 404 페이지 - 존재하지 않는 경로 처리 */}
        <Route
          path="*"
          element={
            <MainLayout>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <h1>페이지를 찾을 수 없습니다</h1>
                <p>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
                <button
                  onClick={() =>
                    navigate(
                      isAuthenticated
                        ? isAdmin
                          ? '/admin'
                          : '/dashboard'
                        : '/login'
                    )
                  }
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  홈으로 이동
                </button>
              </div>
            </MainLayout>
          }
        />
      </Routes>
    </ErrorBoundaryWithFallback>
  );
};

export default AppRoutes;
