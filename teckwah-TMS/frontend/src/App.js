import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Spin, message } from 'antd';
import { logout, setUserData } from './utils/Auth';
import { checkSession } from './api/AuthService';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HandoverPage from './pages/HandoverPage';
import VisualizationPage from './pages/VisualizationPage';
import UserManagePage from './pages/UserManagePage';
import NotFoundPage from './pages/NotFoundPage';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

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
  const [userData, setUserDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // 글로벌 오류 처리 설정
    const errorHandler = function (message, source, lineno, colno, error) {
      console.error('전역 오류 발생:', {
        message,
        source,
        lineno,
        colno,
        error,
      });
      message.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return true;
    };
    window.onerror = errorHandler;

    // 인증 상태 확인 함수 - 세션 기반으로만 인증 확인 (오류 처리 강화)
    const checkAuthStatus = async () => {
      try {
        // 로그인 페이지에서는 세션 체크를 건너뛸 수 있음
        if (location.pathname.includes('/login')) {
          setLoading(false);
          return;
        }

        // 세션 상태 확인 API 직접 호출
        const response = await checkSession();

        if (response && response.success) {
          // 세션이 유효한 경우
          setUserDataState(response.data.user);
          setUserData(response.data.user); // util에도 저장
          setAuth(true);
        } else {
          // 세션이 유효하지 않은 경우
          console.error('세션이 유효하지 않음, 로그인 페이지로 리다이렉션');
          logout();
          setAuth(false);
          setUserDataState(null);
          // 로그인 페이지로 즉시 리다이렉트
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        // API 호출 실패 (세션 없음 등)
        console.error('인증 확인 오류:', error);

        // 세션 만료 또는 인증 오류 발생 시 로그인 페이지로 리다이렉트
        logout();
        setAuth(false);
        setUserDataState(null);

        // 로그인 페이지로 즉시 이동
        window.location.href = '/login';
        return;
      } finally {
        // 로딩 상태 해제
        setLoading(false);
      }
    };

    // 초기 인증 상태 확인
    checkAuthStatus();

    return () => {
      window.onerror = null; // 이벤트 핸들러 정리
    };
  }, [location.pathname]);

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
                <Navigate to="/dashboard/list" replace />
              ) : (
                <LoginPage setAuth={setAuth} setUserData={setUserDataState} />
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
                      collapsed ? 'with-collapsed-sidebar' : ''
                    }`}
                  >
                    <Content className="content-wrapper">
                      <ErrorBoundary>
                        <Routes>
                          <Route
                            index
                            element={<Navigate to="/dashboard/list" replace />}
                          />
                          <Route
                            path="/dashboard"
                            element={<Navigate to="/dashboard/list" replace />}
                          />
                          <Route
                            path="/dashboard/list"
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
