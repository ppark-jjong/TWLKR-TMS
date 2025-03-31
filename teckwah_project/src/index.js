// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import koKR from 'antd/lib/locale/ko_KR';
import App from './App';

// 경로 지정
// 참고: 이 CSS는 빌드 시 정적 파일로 이동하므로, 빌드 후에는 PUBLIC_URL에 의해 올바르게 참조됩니다.
import './public/global.css';

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
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={koKR}>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
