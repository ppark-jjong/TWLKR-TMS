/**
 * 앱 루트 컴포넌트
 */
import React from 'react';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import koKR from 'antd/lib/locale/ko_KR';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/ko';

import AppRoutes from './routes';
import { AuthProvider } from './contexts/AuthContext';

// dayjs 설정 - 한국어 및 서울 시간대
dayjs.locale('ko');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

// React Query 클라이언트 생성 - 모든 재시도 로직 최소화
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0, // 재시도 없음
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={koKR}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          },
        }}
      >
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
