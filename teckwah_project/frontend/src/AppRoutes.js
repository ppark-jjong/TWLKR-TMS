// frontend/src/AppRoutes.js
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisualizationPage from './pages/VisualizationPage';
import MainLayout from './components/common/MainLayout';
import { useAuth } from './contexts/AuthContext';
import message from './utils/message';

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

  // 인증이 필요한 라우트를 위한 래퍼 컴포넌트
  const PrivateRoute = ({ children }) => {
    if (authChecking) {
      // 인증 체크 중일 때는 로딩 표시
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

    if (!user) {
      // 인증되지 않은 경우 로그인 페이지로 리디렉션
      localStorage.setItem('returnUrl', location.pathname);
      message.error('로그인이 필요합니다');
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route
        path="/login"
        element={
          authChecking ? (
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
          ) : user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* 대시보드 페이지 - 통합 */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </PrivateRoute>
        }
      />

      {/* 관리자 페이지는 대시보드 페이지로 리디렉션 */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

      {/* 시각화 페이지 - 모든 사용자 접근 가능 */}
      <Route
        path="/visualization"
        element={
          <PrivateRoute>
            <MainLayout>
              <VisualizationPage />
            </MainLayout>
          </PrivateRoute>
        }
      />

      {/* 기본 경로는 대시보드로 리디렉션 */}
      <Route
        path="/"
        element={
          authChecking ? (
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
  );
};

export default AppRoutes;
