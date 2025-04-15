/**
 * 라우팅 설정
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 페이지 컴포넌트
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import HandoverPage from '../pages/HandoverPage';
import VisualizationPage from '../pages/VisualizationPage';
import UserManagePage from '../pages/UserManagePage';
import NotFoundPage from '../pages/NotFoundPage';

// 인증 보호 라우트
import ProtectedRoute from './ProtectedRoute';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 루트 경로는 대시보드로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 로그인 페이지 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 보호된 라우트 - 인증 필요 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/handover"
          element={
            <ProtectedRoute>
              <HandoverPage />
            </ProtectedRoute>
          }
        />
        
        {/* 관리자 전용 라우트 */}
        <Route
          path="/visualization"
          element={
            <ProtectedRoute adminOnly>
              <VisualizationPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <UserManagePage />
            </ProtectedRoute>
          }
        />
        
        {/* 404 페이지 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
