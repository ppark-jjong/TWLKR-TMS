// src/App.js
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Layout, message } from "antd";
import { isAuthenticated, getUserFromToken } from "./utils/authHelpers";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import HandoverPage from "./pages/HandoverPage";
import NotFoundPage from "./pages/NotFoundPage";
import Sidebar from "./components/Sidebar";

const { Content } = Layout;

// 전역 오류 핸들러 설정
window.onerror = function (message, source, lineno, colno, error) {
  console.error("전역 오류 발생:", { message, source, lineno, colno, error });

  // 오류 정보를 콘솔에만 로깅하고 자동 새로고침은 제거
  if (error && error.stack) {
    console.error("Stack trace:", error.stack);
  }

  // 내장 alert를 사용하지 않고 콘솔에만 기록
  return true; // 오류 처리됨을 브라우저에 알림
};

// 권한 기반 라우팅 컴포넌트
const ProtectedRoute = ({ element, allowedRoles, userData }) => {
  // 권한 체크
  const hasAccess = allowedRoles.includes(userData?.user_role);

  // 권한이 없으면 적절한 페이지로 리디렉션
  if (!hasAccess) {
    return userData?.user_role === "ADMIN" ? (
      <Navigate to="/admin" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  // 권한이 있으면 해당 컴포넌트 렌더링
  return element;
};

// 인증 검사 래퍼 컴포넌트
const AuthWrapper = ({ children }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuthStatus = () => {
      const { isAuth } = isAuthenticated();
      setIsAuth(isAuth);
      setChecking(false);
    };

    checkAuthStatus();

    // 주기적으로 인증 상태 확인 (30초마다)
    const interval = setInterval(checkAuthStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (checking) {
    return <div>인증 확인 중...</div>;
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [auth, setAuth] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 인증 상태 확인
    const checkAuth = () => {
      const { isAuth, userData } = isAuthenticated();
      setAuth(isAuth);
      setUserData(userData);
      setLoading(false);
    };

    checkAuth();
  }, []);

  // 인증 로딩 중 스피너 표시
  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="app">
      <Routes>
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={
            auth ? (
              <Navigate
                to={userData?.user_role === "ADMIN" ? "/admin" : "/dashboard"}
              />
            ) : (
              <LoginPage setAuth={setAuth} setUserData={setUserData} />
            )
          }
        />

        {/* 대시보드 페이지 (일반 사용자) */}
        <Route
          path="/dashboard"
          element={
            <AuthWrapper>
              <Layout>
                <Sidebar userData={userData} setAuth={setAuth} />
                <Layout className="site-layout">
                  <Content className="content-wrapper">
                    <ProtectedRoute
                      element={<DashboardPage />}
                      allowedRoles={["USER"]}
                      userData={userData}
                    />
                  </Content>
                </Layout>
              </Layout>
            </AuthWrapper>
          }
        />

        {/* 관리자 페이지 (관리자 전용) */}
        <Route
          path="/admin"
          element={
            <AuthWrapper>
              <Layout>
                <Sidebar userData={userData} setAuth={setAuth} />
                <Layout className="site-layout">
                  <Content className="content-wrapper">
                    <ProtectedRoute
                      element={<AdminPage />}
                      allowedRoles={["ADMIN"]}
                      userData={userData}
                    />
                  </Content>
                </Layout>
              </Layout>
            </AuthWrapper>
          }
        />

        {/* 사용자 관리 페이지 (관리자 전용) */}
        <Route
          path="/admin/users"
          element={
            <AuthWrapper>
              <Layout>
                <Sidebar userData={userData} setAuth={setAuth} />
                <Layout className="site-layout">
                  <Content className="content-wrapper">
                    <ProtectedRoute
                      element={<AdminPage activeTab="users" />}
                      allowedRoles={["ADMIN"]}
                      userData={userData}
                    />
                  </Content>
                </Layout>
              </Layout>
            </AuthWrapper>
          }
        />

        {/* 인수인계 페이지 (공통) */}
        <Route
          path="/handover"
          element={
            <AuthWrapper>
              <Layout>
                <Sidebar userData={userData} setAuth={setAuth} />
                <Layout className="site-layout">
                  <Content className="content-wrapper">
                    <HandoverPage />
                  </Content>
                </Layout>
              </Layout>
            </AuthWrapper>
          }
        />

        {/* 메인 페이지 리다이렉트 (권한에 따라) */}
        <Route
          path="/"
          element={
            <AuthWrapper>
              <Navigate
                to={userData?.user_role === "ADMIN" ? "/admin" : "/dashboard"}
              />
            </AuthWrapper>
          }
        />

        {/* 404 페이지 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
