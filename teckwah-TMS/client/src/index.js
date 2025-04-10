import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import koKR from 'antd/lib/locale/ko_KR';
import App from './App';
import './styles/global.css';

// 전역 API 쿼리 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
});

// 앱 루트 생성
const root = ReactDOM.createRoot(document.getElementById('root'));

// 애플리케이션 렌더링
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={koKR}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
