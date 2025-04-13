import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ConfigProvider, Layout, Spin, message } from "antd";
import { isAuthenticated, logout } from "./utils/Auth";
import { checkSession } from "./api/AuthService";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import HandoverPage from "./pages/HandoverPage";
import VisualizationPage from "./pages/VisualizationPage";
import UserManagePage from "./pages/UserManagePage";
import NotFoundPage from "./pages/NotFoundPage";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";

const { Content } = Layout;

// 인증 확인 Wrapper 컴포넌트 (App의 auth 상태 활용)
const AuthWrapper = ({ children, auth }) => {
  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [auth, setAuth] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 글로벌 오류 처리 설정 - useEffect 내부로 이동
    const errorHandler = function (message, source, lineno, colno, error) {
      console.error("전역 오류 발생:", {
        message,
        source,
        lineno,
        colno,
        error,
      });
      message.error("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return true;
    };
    window.onerror = errorHandler;

    // 인증 상태 확인 함수
    const checkAuthStatus = async () => {
      try {
        const { isAuth, userData } = isAuthenticated();

        if (isAuth) {
          // 세션 상태 확인
          try {
            const response = await checkSession();
            if (response.success) {
              setUserData(response.data.user);
              setAuth(true);
            } else {
              // 세션이 유효하지 않으면 로그아웃 처리
              logout();
              setAuth(false);
              setUserData(null);
            }
          } catch (apiError) {
            // API 호출 실패 시 (세션 만료 등) 로그아웃 처리
            console.warn("세션 확인 실패, 로그아웃 처리:", apiError);
            logout();
            setAuth(false);
            setUserData(null);
          }
        } else {
          setAuth(false);
          setUserData(null);
        }
      } catch (error) {
        console.error("인증 상태 확인 중 오류 발생:", error);
        setAuth(false);
        setUserData(null);
      } finally {
        // 로딩 상태 즉시 해제 (사용자 경험을 위한 지연 없음)
        setLoading(false);
      }
    };

    // 초기 인증 상태 확인
    checkAuthStatus();

    return () => {
      window.onerror = null; // 이벤트 핸들러 정리
    };
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // 로딩 중 화면
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <ConfigProvider>
      <div className="app">
        <Routes>
          {/* 로그인 페이지 */}
          <Route
            path="/login"
            element={
              auth ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage setAuth={setAuth} setUserData={setUserData} />
              )
            }
          />

          {/* 메인 레이아웃 */}
          <Route
            path="/"
            element={
              <AuthWrapper auth={auth}>
                <Layout className="main-layout">
                  <Sidebar
                    userData={userData}
                    setAuth={setAuth}
                    collapsed={collapsed}
                    toggleSidebar={toggleSidebar}
                  />
                  <Layout
                    className={`site-layout ${
                      collapsed ? "with-collapsed-sidebar" : ""
                    }`}
                  >
                    <Content className="content-wrapper">
                      <ErrorBoundary>
                        <Routes>
                          <Route
                            index
                            element={<Navigate to="/dashboard" replace />}
                          />
                          <Route
                            path="/dashboard/*"
                            element={<DashboardPage />}
                          />
                          <Route path="/handover" element={<HandoverPage />} />
                          <Route
                            path="/visualization"
                            element={<VisualizationPage />}
                          />
                          <Route path="/users" element={<UserManagePage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </ErrorBoundary>
                    </Content>
                  </Layout>
                </Layout>
              </AuthWrapper>
            }
          />

          {/* 404 페이지 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </ConfigProvider>
  );
}

export default App;