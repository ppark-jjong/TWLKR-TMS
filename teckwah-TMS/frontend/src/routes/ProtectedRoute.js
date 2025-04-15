/**
 * 보호된 라우트 컴포넌트
 * - 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageLoading } from '../components/common';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();
  
  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return <PageLoading tip="인증 확인 중..." />;
  }
  
  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // 관리자 전용 페이지인데 관리자가 아닌 경우 대시보드로 리다이렉트
  if (adminOnly && currentUser?.userRole !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // 인증된 경우 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute;
