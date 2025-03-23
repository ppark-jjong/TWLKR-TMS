// src/AppRoutes.js
import React, { Suspense, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/common/ErrorBoundary"; // 기존 ErrorBoundary 사용
import LoadingSpin from "./components/common/LoadingSpin";
import MainLayout from "./components/common/MainLayout";
import message from "./utils/message";
import { MessageKeys } from "./utils/Constants";
import TokenManager from "./utils/TokenManager";

// 코드 분할 최적화를 위한 지연 로딩
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const VisualizationPage = React.lazy(() => import("./pages/VisualizationPage"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const DownloadPage = React.lazy(() => import("./pages/DownloadPage"));

/**
 * 애플리케이션 라우팅 컴포넌트
 * 권한 기반 접근 제어 및 최적화된 코드 분할 라우팅 구현
 */
const AppRoutes = () => {
  const { user, authChecking, isAuthenticated, isAdmin, retryAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 인증 상태 변경 감지 및 처리
  useEffect(() => {
    // 권한 필요한 경로에 접근할 때 인증 확인
    const currentPath = location.pathname;
    const publicPaths = ["/login"];
    const adminPaths = ["/admin"];

    // 페이지 이동 시 권한 검증
    if (!authChecking && !publicPaths.includes(currentPath)) {
      // 인증되지 않은 경우
      if (!isAuthenticated) {
        console.warn("인증되지 않은 사용자의 보호된 경로 접근:", currentPath);

        // 인증 재시도
        retryAuth().then((success) => {
          if (!success) {
            // 원래 가려던 경로 저장
            TokenManager.setReturnUrl(currentPath);
            message.warning("로그인이 필요합니다", MessageKeys.AUTH.SESSION);
            navigate("/login", { replace: true });
          }
        });
      }
      // 관리자 경로에 일반 사용자 접근 시
      else if (adminPaths.includes(currentPath) && !isAdmin) {
        console.warn("일반 사용자의 관리자 경로 접근:", currentPath);
        message.error("관리자 권한이 필요합니다", MessageKeys.AUTH.PERMISSION);
        navigate("/dashboard", { replace: true });
      }
    }
  }, [
    location.pathname,
    isAuthenticated,
    isAdmin,
    authChecking,
    navigate,
    retryAuth,
  ]);

  // 지연 로딩 컴포넌트를 위한 Suspense Fallback
  const SuspenseFallback = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <LoadingSpin tip="컴포넌트 로딩 중..." />
    </div>
  );

  // 인증이 필요한 라우트를 위한 래퍼 컴포넌트
  const PrivateRoute = ({ children, requireAdmin = false }) => {
    if (authChecking) {
      return SuspenseFallback;
    }

    if (!isAuthenticated) {
      // 인증되지 않은 경우 로그인 페이지로 리디렉션
      TokenManager.setReturnUrl(location.pathname);
      console.info("인증 필요: 로그인 페이지로 리디렉션", location.pathname);
      return <Navigate to="/login" replace />;
    }

    // 관리자 권한이 필요한 라우트에 대한 추가 검증
    if (requireAdmin && !isAdmin) {
      console.warn("관리자 권한 필요: 대시보드로 리디렉션");
      message.error("관리자 권한이 필요합니다", MessageKeys.AUTH.PERMISSION);
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // 로딩 중일 때 렌더링할 내용
  if (authChecking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <LoadingSpin tip="인증 정보 확인 중..." />
      </div>
    );
  }

  return (
    <ErrorBoundary name="라우팅">
      <Routes>
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
            ) : (
              <Suspense fallback={SuspenseFallback}>
                <ErrorBoundary name="로그인 페이지">
                  <LoginPage />
                </ErrorBoundary>
              </Suspense>
            )
          }
        />
        {/* 대시보드 페이지 */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundary name="대시보드 페이지">
                    <DashboardPage />
                  </ErrorBoundary>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />
        {/* 관리자 페이지 - requireAdmin 속성 추가 */}
        <Route
          path="/admin"
          element={
            <PrivateRoute requireAdmin={true}>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundary name="관리자 페이지">
                    <AdminPage />
                  </ErrorBoundary>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />
        {/* 다운로드 페이지 */}
        <Route
          path="/download"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundary name="다운로드 페이지">
                    <DownloadPage />
                  </ErrorBoundary>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />
        {/* 시각화 페이지 */}
        <Route
          path="/visualization"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={SuspenseFallback}>
                  <ErrorBoundary name="시각화 페이지">
                    <VisualizationPage />
                  </ErrorBoundary>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />
        {/* 기본 경로 - 권한에 따라 리디렉션 */}
        <Route
          path="/"
          element={
            authChecking ? (
              SuspenseFallback
            ) : !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isAdmin ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        {/* 404 페이지 - 존재하지 않는 경로 처리 */}
        <Route
          path="*"
          element={
            <MainLayout>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <h1>페이지를 찾을 수 없습니다</h1>
                <p>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
                <button
                  onClick={() =>
                    navigate(
                      isAuthenticated
                        ? isAdmin
                          ? "/admin"
                          : "/dashboard"
                        : "/login"
                    )
                  }
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1890ff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  홈으로 이동
                </button>
              </div>
            </MainLayout>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

export default AppRoutes;
