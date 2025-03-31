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
import HandoverPage from './pages/HandoverPage';
import NotFoundPage from './pages/NotFoundPage';
import Sidebar from './components/Sidebar';

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
    <div className="app">
      <Router>
        <Routes>
          {/* 로그인 페이지 */}
          <Route
            path="/login"
            element={
              auth ? (
                <Navigate
                  to={userData?.user_role === 'ADMIN' ? '/admin' : '/dashboard'}
                />
              ) : (
                <LoginPage setAuth={setAuth} />
              )
            }
          />

          {/* 인증 필요한 페이지들 */}
          <Route
            path="/"
            element={
              auth ? (
                <Layout>
                  <Sidebar userData={userData} setAuth={setAuth} />
                  <Layout className="site-layout">
                    <Content className="content-wrapper">
                      <Routes>
                        {/* 대시보드 페이지 (일반 사용자) */}
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

                        {/* 관리자 페이지 (관리자 전용) */}
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

                        {/* 사용자 관리 페이지 (관리자 전용) */}
                        <Route
                          path="/admin/users"
                          element={
                            <ProtectedRoute
                              element={<AdminPage activeTab="users" />}
                              allowedRoles={['ADMIN']}
                              userData={userData}
                            />
                          }
                        />

                        {/* 인수인계 페이지 (공통) */}
                        <Route path="/handover" element={<HandoverPage />} />

                        {/* 메인 페이지 리다이렉트 (권한에 따라) */}
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute
                              element={
                                <Navigate
                                  to={
                                    userData?.user_role === 'ADMIN'
                                      ? '/admin'
                                      : '/dashboard'
                                  }
                                />
                              }
                              allowedRoles={['USER', 'ADMIN']}
                              userData={userData}
                            />
                          }
                        />
                      </Routes>
                    </Content>
                  </Layout>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
