// frontend/src/App.js
import React, { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import { AuthProvider } from "./contexts/AuthContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import setupAxiosInterceptors from "./utils/AxiosConfig";
import LoadingSpin from "./components/common/LoadingSpin";

// 지연 로딩으로 AppRoutes 분리
const AppRoutes = lazy(() =>
  import(/* webpackChunkName: "app-routes" */ "./AppRoutes")
);

// axios 인터셉터 설정 초기화
setupAxiosInterceptors();

// 메인 페이지 로딩용 컴포넌트
const PageLoadingFallback = () => (
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
    <LoadingSpin tip="페이지 로딩 중..." />
  </div>
);

const App = () => {
  const theme = React.useMemo(
    () => ({
      token: {
        colorPrimary: "#1890ff",
      },
    }),
    []
  );

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ConfigProvider locale={koKR} theme={theme}>
          <AuthProvider>
            <DashboardProvider>
              <Suspense fallback={<PageLoadingFallback />}>
                <AppRoutes />
              </Suspense>
            </DashboardProvider>
          </AuthProvider>
        </ConfigProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
