// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import AppRoutes from './AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardProvider } from './contexts/DashboardContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import setupAxiosInterceptors from './utils/AxiosConfig';

/**
 * 앱의 최상위 컴포넌트
 */
const App = () => {
  // axios 인터셉터 설정
  React.useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={koKR}
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <AuthProvider>
          <DashboardProvider>
            <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} /> 
                <AppRoutes />
              </Routes>
            </BrowserRouter>
          </DashboardProvider>
        </AuthProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;