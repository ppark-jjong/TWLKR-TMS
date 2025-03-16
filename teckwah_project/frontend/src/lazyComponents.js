// src/lazyComponents.js
import { lazy } from 'react';

// 페이지 컴포넌트 지연 로딩 (기존 코드)
export const DashboardPage = lazy(() => import('./pages/DashboardPage'));
export const VisualizationPage = lazy(() =>
  import('./pages/VisualizationPage')
);
export const LoginPage = lazy(() => import('./pages/LoginPage'));

// 모달 컴포넌트 지연 로딩 (추가)
export const DashboardDetailModal = lazy(() =>
  import('./components/dashboard/DashboardDetailModal')
);
export const CreateDashboardModal = lazy(() =>
  import('./components/dashboard/CreateDashboardModal')
);
export const AssignDriverModal = lazy(() =>
  import('./components/dashboard/AssignDriverModal')
);

// 시각화 컴포넌트 지연 로딩 (추가)
export const StatusPieChart = lazy(() =>
  import('./components/visualization/StatusPieChart')
);
export const HourlyBarChart = lazy(() =>
  import('./components/visualization/HourlyBarChart')
);

// 테이블 컴포넌트 지연 로딩 (추가)
export const DashboardTable = lazy(() =>
  import('./components/dashboard/DashboardTable')
);
