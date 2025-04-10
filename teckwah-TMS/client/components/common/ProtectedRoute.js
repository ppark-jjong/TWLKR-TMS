import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../hooks/useAuth';

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 * @param {Object} props
 * @param {boolean} props.adminOnly - 관리자만 접근 가능한지 여부
 */
const ProtectedRoute = ({ adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  // 로딩 중이면 로딩 스피너 표시
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="사용자 정보를 불러오는 중..." />
      </div>
    );
  }

  // 인증되지 않았으면 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 관리자 전용 페이지인데 관리자가 아니면 대시보드로 리다이렉트
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  // 인증된 사용자는 자식 라우트로 진행
  return <Outlet />;
};

export default ProtectedRoute;