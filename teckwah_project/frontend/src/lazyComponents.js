// src/lazyComponents.js
import { lazy } from 'react';

/**
 * 컴포넌트 지연 로딩 설정
 *
 * 각 컴포넌트는 실제로 필요한 시점에만 로드되어 초기 번들 크기를 줄입니다.
 * 이는 첫 페이지 로딩 시간을 단축시키는 중요한 최적화 기법입니다.
 */

// 페이지 컴포넌트 지연 로딩
export const DashboardPage = lazy(() =>
  import(/* webpackChunkName: "dashboard-page" */ './pages/DashboardPage')
);

export const VisualizationPage = lazy(() =>
  import(
    /* webpackChunkName: "visualization-page" */ './pages/VisualizationPage'
  )
);

export const LoginPage = lazy(() =>
  import(/* webpackChunkName: "login-page" */ './pages/LoginPage')
);

// 모달 컴포넌트 지연 로딩 (사용자 인터랙션 시에만 로드)
export const DashboardDetailModal = lazy(() =>
  import(
    /* webpackChunkName: "dashboard-detail-modal" */ './components/dashboard/DashboardDetailModal'
  )
);

export const CreateDashboardModal = lazy(() =>
  import(
    /* webpackChunkName: "create-dashboard-modal" */ './components/dashboard/CreateDashboardModal'
  )
);

export const AssignDriverModal = lazy(() =>
  import(
    /* webpackChunkName: "assign-driver-modal" */ './components/dashboard/AssignDriverModal'
  )
);

// 시각화 컴포넌트 지연 로딩
export const StatusPieChart = lazy(() =>
  import(
    /* webpackChunkName: "status-pie-chart" */ './components/visualization/StatusPieChart'
  )
);

export const HourlyBarChart = lazy(() =>
  import(
    /* webpackChunkName: "hourly-bar-chart" */ './components/visualization/HourlyBarChart'
  )
);

// 테이블 컴포넌트 지연 로딩
export const DashboardTable = lazy(() =>
  import(
    /* webpackChunkName: "dashboard-table" */ './components/dashboard/DashboardTable'
  )
);

// 새로운 모듈식 분리 - 필요에 따라 그룹화
// 차트 라이브러리 관련 컴포넌트 (큰 번들 크기)
export const ChartComponents = lazy(() =>
  import(
    /* webpackChunkName: "chart-components" */ './components/visualization/ChartComponents'
  )
);

// 옵션 설정들을 사전 로드하는 함수 - 필요시 호출
export const preloadChartComponents = () => {
  import(
    /* webpackChunkName: "chart-components" */ './components/visualization/ChartComponents'
  );
};

// 사용자 권한별 컴포넌트 그룹화
export const AdminComponents = lazy(() =>
  import(
    /* webpackChunkName: "admin-components" */ './components/admin/AdminComponents'
  )
);
