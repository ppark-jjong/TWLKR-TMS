/**
 * 보호된 라우트 컴포넌트
 * - 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
 * - 권한이 없는 사용자는 대시보드로 리다이렉트
 */
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageLoading } from '../components/common';
import { message } from 'antd';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();
  
  // 디버깅 로그 추가
  useEffect(() => {
    console.log('Protected Route 렌더링:', {
      path: location.pathname,
      isAuthenticated,
      isLoading,
      currentUser,
      adminOnly
    });
  }, [location.pathname, isAuthenticated, isLoading, currentUser, adminOnly]);
  
  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    console.log('인증 확인 중...');
    return <PageLoading tip="인증 확인 중..." />;
  }
  
  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    console.log('인증되지 않음, 로그인 페이지로 리다이렉션');
    message.warning('로그인이 필요합니다.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // 관리자 전용 페이지인데 관리자가 아닌 경우 대시보드로 리다이렉트
  if (adminOnly && currentUser?.userRole !== 'ADMIN') {
    console.log('관리자 권한 필요, 대시보드로 리다이렉션');
    message.error('해당 페이지에 접근할 권한이 없습니다.');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('인증 및 권한 확인 완료, 페이지 접근 허용');
  // 인증된 경우 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute;