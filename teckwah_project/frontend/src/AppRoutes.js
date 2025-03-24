// src/AppRoutes.js - 수정된 라우팅
import React, { Suspense, useEffect, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundaryWithFallback from './utils/ErrorBoundaryWithFallback';
import LoadingSpin from './components/common/LoadingSpin';
import MainLayout from './components/common/MainLayout';
import MessageUtil from './utils/MessageUtil';
import { MessageKeys } from './utils/Constants';
import TokenManager from './utils/TokenManager';
import Logger from './utils/Logger';

// 코드 분할 최적화를 위한 지연 로딩
const LoginPage = lazy(() => import('./pages/LoginPage'));

// 인증이 필요한 페이지들
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VisualizationPage = lazy(() => import('./pages/VisualizationPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));

const logger = Logger.getLogger('AppRoutes');

/**
 * 애플리케이션 라우팅 컴포넌트
 * 관리자 페이지 삭제 및 대시보드 통합, 다운로드 페이지 관리자 권한 제한
 */
const AppRoutes = () => {
  const { user, authChecking, isAuthenticated, isAdmin, retryAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 인증 상태 변경 감지 및 처리
  useEffect(() => {
    // 권한 필요한 경로에 접근할 때 인증 확인
    const currentPath = location.pathname;
    const publicPaths = ['/login'];
    const adminPaths = ['/download']; // 관리자 전용 경로

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

            MessageUtil.warning(
              '로그인이 필요합니다',
              MessageKeys.AUTH.SESSION
            );
            navigate('/login', { replace: true });
          }
        });
      }
      // 관리자 경로에 일반 사용자 접근 시
      else if (adminPaths.includes(currentPath) && !isAdmin) {
        logger.warn('일반 사용자의 관리자 경로 접근:', currentPath);
        MessageUtil.error(
          '관리자 권한이 필요합니다',
          MessageKeys.AUTH.PERMISSION
        );
        navigate('/dashboard', { replace: true });
      }
    }
  }, [
    location.pathname,
    isAuthenticated,
    isAdmin,
    authChecking,
    navigate,
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
      MessageUtil.error(
        '관리자 권한이 필요합니다',
        MessageKeys.AUTH.PERMISSION
      );
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
              <Navigate to="/dashboard" replace />
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

        {/* 다운로드 페이지 - 관리자 전용 */}
        <Route
          path="/download"
          element={
            <PrivateRoute requireAdmin={true}>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundaryWithFallback name="다운로드 페이지">
                    <DownloadPage />
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

        {/* 기본 경로 - 대시보드로 리디렉션 */}
        <Route
          path="/"
          element={
            authChecking ? (
              SuspenseFallback
            ) : !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* 이전 Admin 경로는 대시보드로 리디렉션 */}
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

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
                    navigate(isAuthenticated ? '/dashboard' : '/login')
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
