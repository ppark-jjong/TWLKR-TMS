// src/App.js
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Layout } from 'antd';
import { isAuthenticated, getUserFromToken } from './utils/authHelpers';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import VisualizationPage from './pages/VisualizationPage';
import NotFoundPage from './pages/NotFoundPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const { Content } = Layout;

// 권한 기반 라우팅 컴포넌트
const ProtectedRoute = ({ element, allowedRoles, userData }) => {
  // 권한 체크
  const hasAccess = allowedRoles.includes(userData?.user_role);

  // 권한이 없으면 적절한 페이지로 리디렉션
  if (!hasAccess) {
    return userData?.user_role === 'ADMIN' ? (
      <Navigate to="/admin" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  // 권한이 있으면 해당 컴포넌트 렌더링
  return element;
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
    <Router>
      {auth ? (
        <Layout style={{ minHeight: '100vh' }}>
          <Sidebar userData={userData} />
          <Layout className="site-layout">
            <Header userData={userData} setAuth={setAuth} />
            <Content style={{ margin: '16px' }}>
              <Routes>
                {/* 권한별 라우팅 설정 */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute
                      element={<DashboardPage />}
                      allowedRoles={['USER']}
                      userData={userData}
                    />
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute
                      element={<AdminPage />}
                      allowedRoles={['ADMIN']}
                      userData={userData}
                    />
                  }
                />
                <Route path="/visualization" element={<VisualizationPage />} />
                <Route
                  path="/"
                  element={
                    userData?.user_role === 'ADMIN' ? (
                      <Navigate to="/admin" replace />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={<LoginPage setAuth={setAuth} setUserData={setUserData} />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
