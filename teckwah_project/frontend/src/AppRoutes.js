// frontend/src/AppRoutes.js - 지연 로딩 적용 버전
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/common/MainLayout';
import { useAuth } from './contexts/AuthContext';
import message from './utils/message';
import LoadingSpin from './components/common/LoadingSpin';
import ErrorBoundaryWithFallback from './utils/ErrorBoundaryWithFallback';
import { DashboardPage, VisualizationPage, LoginPage } from './lazyComponents';

const AppRoutes = () => {
  const { user, authChecking } = useAuth();
  const location = useLocation();

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
        <div className="loading-spinner"></div>
        <p>인증 정보 확인 중...</p>
      </div>
    );
  }

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
  const PrivateRoute = ({ children }) => {
    if (authChecking) {
      return SuspenseFallback;
    }

    if (!user) {
      // 인증되지 않은 경우 로그인 페이지로 리디렉션
      localStorage.setItem('returnUrl', location.pathname);
      message.error('로그인이 필요합니다');
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <ErrorBoundaryWithFallback name="라우팅">
      <Routes>
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={
            authChecking ? (
              SuspenseFallback
            ) : user ? (
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

        {/* 관리자 페이지 */}
        <Route
          path="/admin"
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

        {/* 기본 경로 */}
        <Route
          path="/"
          element={
            authChecking ? (
              SuspenseFallback
            ) : !user ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* 404 페이지 */}
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
                }}
              >
                <h1>페이지를 찾을 수 없습니다</h1>
              </div>
            </MainLayout>
          }
        />
      </Routes>
    </ErrorBoundaryWithFallback>
  );
};

export default AppRoutes;
