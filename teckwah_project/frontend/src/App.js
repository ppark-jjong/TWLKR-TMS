// frontend/src/App.js
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import AppRoutes from './AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardProvider } from './contexts/DashboardContext';
import ErrorBoundary from './components/common/ErrorBoundary';

/**
 * 앱의 최상위 컴포넌트
 * BrowserRouter를 최상위에 배치하여 라우팅 컨텍스트 제공
 */
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