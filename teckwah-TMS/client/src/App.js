import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Spin, message } from 'antd';
import { isAuthenticated } from './utils/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HandoverPage from './pages/HandoverPage';
import VisualizationPage from './pages/VisualizationPage';
import NotFoundPage from './pages/NotFoundPage';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

const { Content } = Layout;

// 인증 확인 Wrapper 컴포넌트
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
        console.error('인증 상태 확인 중 오류 발생:', error);
        setChecking(false);
        setIsAuth(false);
      }
    };

    checkAuthStatus();

    // 인증 상태 주기적 확인 (30초마다)
    const interval = setInterval(checkAuthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (checking) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>인증 상태 확인 중...</div>
      </div>
    );
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 초기 인증 상태 확인
    try {
      const { isAuth, userData } = isAuthenticated();
      setAuth(isAuth);
      setUserData(userData);
      
      // 로딩 상태를 잠시 지연시켜 부드러운 화면 전환
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('인증 상태 확인 중 오류 발생:', error);
      setLoading(false);
      setAuth(false);
      setUserData(null);
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // 글로벌 오류 처리 설정
  window.onerror = function (message, source, lineno, colno, error) {
    console.error('전역 오류 발생:', { message, source, lineno, colno, error });
    message.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    return true;
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
              <AuthWrapper>
                <Layout className="main-layout">
                  <Sidebar 
                    userData={userData} 
                    setAuth={setAuth}
                    collapsed={collapsed}
                    toggleSidebar={toggleSidebar}
                  />
                  <Layout className={`site-layout ${collapsed ? 'with-collapsed-sidebar' : ''}`}>
                    <Content className="content-wrapper">
                      <ErrorBoundary>
                        <Routes>
                          <Route index element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard/*" element={<DashboardPage />} />
                          <Route path="/handover" element={<HandoverPage />} />
                          <Route path="/visualization" element={<VisualizationPage />} />
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
