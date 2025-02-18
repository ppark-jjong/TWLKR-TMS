// frontend/src/AppRoutes.js
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrivateRoute from './components/common/PrivateRoute';
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

  // 관리자 접근 제한을 위한 HOC 컴포넌트
  const AdminRoute = ({ children }) => {
    // 로그인하지 않은 경우
    if (!user) {
      message.error('로그인이 필요합니다');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 관리자가 아닌 경우
    if (user.user_role !== 'ADMIN') {
      message.error('관리자만 접근할 수 있습니다');
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // 일반 사용자 인증 체크를 위한 HOC 컴포넌트
  const AuthenticatedRoute = ({ children }) => {
    if (!user) {
      message.error('로그인이 필요합니다');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } 
      />

      {/* 일반 대시보드 */}
      <Route 
        path="/dashboard" 
        element={
          <AuthenticatedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </AuthenticatedRoute>
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
          <AuthenticatedRoute>
            <MainLayout>
              <VisualizationPage />
            </MainLayout>
          </AuthenticatedRoute>
        } 
      />

      {/* 기본 리다이렉션 */}
      <Route 
        path="/" 
        element={<Navigate to="/dashboard" replace />} 
      />

      {/* 404 페이지 */}
      <Route 
        path="*" 
        element={
          <MainLayout>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <h1>페이지를 찾을 수 없습니다</h1>
            </div>
          </MainLayout>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;