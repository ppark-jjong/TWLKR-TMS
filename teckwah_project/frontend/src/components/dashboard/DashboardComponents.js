// src/components/dashboard/DashboardComponents.js
import React from 'react';
import DashboardTable from './DashboardTable';
import DashboardFilters from './DashboardFilters';
import InfoSection from './InfoSection';
import RemarkSection from './RemarkSection';
import LockInfoDisplay from './LockInfoDisplay';
import StatusChangeConfirm from './StatusChangeConfirm';

/**
 * 대시보드 컴포넌트 통합 모듈
 * 관련 컴포넌트들을 한 번에 내보내는 중앙 파일
 */

// 개별 컴포넌트 내보내기
export {
  DashboardTable,
  DashboardFilters,
  InfoSection,
  RemarkSection,
  LockInfoDisplay,
  StatusChangeConfirm,
};

/**
 * 대시보드 정보 표시 영역 컴포넌트
 * InfoSection을 사용하여 여러 항목 그룹을 표시
 */
export const DashboardInfo = ({ dashboard }) => {
  if (!dashboard) return null;

  // 정보 섹션 항목 설정
  const sections = [
    {
      title: '기본 정보',
      items: [
        { label: '부서', value: dashboard.department },
        { label: '종류', value: dashboard.type },
        { label: '출발 허브', value: dashboard.warehouse },
        { label: 'SLA', value: dashboard.sla },
      ],
    },
    {
      title: '배송 시간',
      items: [
        { label: '접수 시각', value: dashboard.create_time },
        { label: '출발 시각', value: dashboard.depart_time },
        { label: '완료 시각', value: dashboard.complete_time },
        { label: 'ETA', value: dashboard.eta, highlight: true },
      ],
    },
    {
      title: '배송 담당자',
      items: [
        { label: '담당 기사', value: dashboard.driver_name, highlight: true },
        { label: '기사 연락처', value: dashboard.driver_contact },
      ],
    },
    {
      title: '배송 세부사항',
      items: [
        { label: '주소', value: dashboard.address },
        { label: '예상 거리', value: dashboard.distance },
        { label: '예상 소요시간', value: dashboard.duration_time },
      ],
    },
    {
      title: '수령인 정보',
      items: [
        { label: '수령인', value: dashboard.customer },
        { label: '연락처', value: dashboard.contact },
      ],
    },
  ];

  return (
    <div className="dashboard-info">
      {sections.map((section, index) => (
        <InfoSection key={index} title={section.title} items={section.items} />
      ))}
    </div>
  );
};

// 모듈 기본 내보내기
export default {
  DashboardTable,
  DashboardFilters,
  InfoSection,
  RemarkSection,
  LockInfoDisplay,
  StatusChangeConfirm,
  DashboardInfo,
};
