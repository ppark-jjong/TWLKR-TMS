// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import koKR from 'antd/lib/locale/ko_KR';
import App from './App';
import './public/global.css';

// Antd 테마 커스텀 설정
const theme = {
  token: {
    colorPrimary: '#1890ff',
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBorder: '#e8e8e8',
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <QueryClientProvider client={queryClient}>
    <ConfigProvider locale={koKR} theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </QueryClientProvider>
);
