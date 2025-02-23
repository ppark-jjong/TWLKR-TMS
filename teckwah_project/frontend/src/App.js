// frontend/src/App.js
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import AppRoutes from './AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardProvider } from './contexts/DashboardContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import setupAxiosInterceptors from './utils/AxiosConfig';

// axios 인터셉터 설정 초기화
setupAxiosInterceptors();

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
              <AppRoutes />
            </DashboardProvider>
          </AuthProvider>
        </ConfigProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
