// src/App.js
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Layout, message, Button, notification, ConfigProvider } from "antd";
import { isAuthenticated, getUserFromToken } from "./utils/authHelpers";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import HandoverPage from "./pages/HandoverPage";
import NotFoundPage from "./pages/NotFoundPage";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import { ReloadOutlined } from "@ant-design/icons";
import { themeVariables } from "./styles/themeConfig";

const { Content } = Layout;

// 전역 오류 핸들러 설정
window.onerror = function (message, source, lineno, colno, error) {
  console.error("전역 오류 발생:", { message, source, lineno, colno, error });

  // 오류 정보를 콘솔에만 로깅
  if (error && error.stack) {
    console.error("Stack trace:", error.stack);
  }

  // 사용자에게 알림으로 오류 정보 표시 (자동 닫힘)
  notification.error({
    message: "오류가 발생했습니다",
    description:
      "일시적인 문제가 발생했습니다. 계속 발생하면 새로고침을 해보세요.",
    duration: 5, // 5초 후 자동으로 닫힘
    btn: (
      <Button
        type="primary"
        size="small"
        icon={<ReloadOutlined />}
        onClick={() => window.location.reload()}
      >
        새로고침
      </Button>
    ),
  });

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
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const { isAuth } = isAuthenticated();
        setIsAuth(isAuth);
        setChecking(false);
      } catch (error) {
        console.error("인증 상태 확인 중 오류 발생:", error);
        // 오류 발생 시에도 체크 상태를 완료로 변경하고 인증되지 않은 것으로 처리
        setChecking(false);
        setIsAuth(false);
      }
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
      try {
        const { isAuth, userData } = isAuthenticated();
        setAuth(isAuth);
        setUserData(userData);
        setLoading(false);
      } catch (error) {
        console.error("초기 인증 상태 확인 중 오류 발생:", error);
        // 오류 발생 시에도 로딩 상태를 완료로 변경
        setLoading(false);
        // 기본적으로 인증되지 않은 상태로 설정
        setAuth(false);
        setUserData(null);
      }
    };

    checkAuth();
  }, []);

  // 인증 로딩 중 스피너 표시
  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <ConfigProvider theme={{ token: themeVariables }}>
      <ErrorBoundary>
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
                        <ErrorBoundary>
                          <ProtectedRoute
                            element={<DashboardPage />}
                            allowedRoles={["USER"]}
                            userData={userData}
                          />
                        </ErrorBoundary>
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
                        <ErrorBoundary>
                          <ProtectedRoute
                            element={<AdminPage />}
                            allowedRoles={["ADMIN"]}
                            userData={userData}
                          />
                        </ErrorBoundary>
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
                        <ErrorBoundary>
                          <ProtectedRoute
                            element={<AdminPage activeTab="users" />}
                            allowedRoles={["ADMIN"]}
                            userData={userData}
                          />
                        </ErrorBoundary>
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
                        <ErrorBoundary>
                          <HandoverPage />
                        </ErrorBoundary>
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
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;