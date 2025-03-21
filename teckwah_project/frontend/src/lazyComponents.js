// src/lazyComponents.js
import { lazy } from 'react';

/**
 * 통합 컴포넌트 지연 로딩 설정
 * 각 기능별로 그룹화된 컴포넌트 분리로 초기 로딩 최적화
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

// 대시보드 관련 컴포넌트 (기능별 그룹화)
export const DashboardComponents = {
  DashboardTable: lazy(() =>
    import(
      /* webpackChunkName: "dashboard-table" */ './components/dashboard/DashboardTable'
    )
  ),
  DashboardFilters: lazy(() =>
    import(
      /* webpackChunkName: "dashboard-filters" */ './components/dashboard/DashboardFilters'
    )
  ),
  DashboardInfoSection: lazy(() =>
    import(
      /* webpackChunkName: "dashboard-info" */ './components/dashboard/InfoSection'
    )
  ),
};

// 모달 컴포넌트 지연 로딩 (사용 시점에 로드)
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

// 시각화 관련 컴포넌트 (기능별 그룹화)
export const VisualizationComponents = {
  StatusPieChart: lazy(() =>
    import(
      /* webpackChunkName: "status-pie-chart" */ './components/visualization/StatusPieChart'
    )
  ),
  HourlyBarChart: lazy(() =>
    import(
      /* webpackChunkName: "hourly-bar-chart" */ './components/visualization/HourlyBarChart'
    )
  ),
};

// 관리자 관련 컴포넌트
export const AdminComponents = lazy(() =>
  import(
    /* webpackChunkName: "admin-components" */ './components/admin/AdminComponents'
  )
);

// 옵션 설정들을 사전 로드하는 함수 - 필요시 호출
export const preloadVisualizationComponents = () => {
  Object.values(VisualizationComponents).forEach((component) => {
    component.preload();
  });
};

// 사용자 인터랙션 예상 시점에 모달 사전 로드
export const preloadModalComponents = () => {
  DashboardDetailModal.preload();
  CreateDashboardModal.preload();
  AssignDriverModal.preload();
};
