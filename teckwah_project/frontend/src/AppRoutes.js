// frontend/src/AppRoutes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisualizationPage from './pages/VisualizationPage';
import MainLayout from './components/common/MainLayout';
import AuthService from './services/AuthService';

/**
 * 인증이 필요한 라우트 컴포넌트
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 */
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!AuthService.getAccessToken();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <MainLayout>{children}</MainLayout>;
};

/**
 * 앱 라우팅 설정 컴포넌트
 */
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/visualization" 
        element={
          <PrivateRoute>
            <VisualizationPage />
          </PrivateRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default AppRoutes;