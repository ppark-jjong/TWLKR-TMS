// frontend/src/AppRoutes.js
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import VisualizationPage from './pages/VisualizationPage';
import MainLayout from './components/common/MainLayout';
import { useAuth } from './contexts/AuthContext';
import message from './utils/message';

const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();

  // 인증이 필요한 라우트를 위한 래퍼 컴포넌트
  const PrivateRoute = ({ children }) => {
    if (!user) {
      // 현재 경로 저장
      localStorage.setItem('returnUrl', location.pathname);
      message.error('로그인이 필요합니다');
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // 관리자 전용 라우트를 위한 래퍼 컴포넌트
  const AdminRoute = ({ children }) => {
    if (!user) {
      localStorage.setItem('returnUrl', location.pathname);
      message.error('로그인이 필요합니다');
      return <Navigate to="/login" replace />;
    }

    if (user.user_role !== 'ADMIN') {
      message.error('관리자만 접근할 수 있습니다');
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* 대시보드 페이지 */}
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

      {/* 관리자 페이지 */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminPage />
            </MainLayout>
          </AdminRoute>
        }
      />

      {/* 시각화 페이지 */}
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

      {/* 기본 경로는 대시보드로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
