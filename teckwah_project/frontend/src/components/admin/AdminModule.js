// src/components/admin/AdminModule.js (수정)
import React, { useEffect } from "react";
import { Layout, Typography, Button, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { FONT_STYLES } from "../../utils/Constants";
import { useAuth } from "../../contexts/AuthContext";
import { useLogger } from "../../utils/LogUtils";
import DashboardTable from "../dashboard/DashboardTable";
import { useDashboard } from "../../contexts/DashboardContext";

const { Title } = Typography;

/**
 * 간소화된 관리자 대시보드 모듈 컴포넌트
 * 대시보드와 유사하지만 모든 상태 변경 및 삭제 기능이 활성화됨
 */
const AdminModule = () => {
  const logger = useLogger("AdminModule");
  const { user } = useAuth();
  const {
    dashboards,
    loading,
    fetchDashboards,
    dateRange,
    setDefaultDateRange,
  } = useDashboard();

  // 초기 데이터 로드
  useEffect(() => {
    // 관리자 권한 검증
    if (!user || user.user_role !== "ADMIN") {
      logger.warn("관리자 권한이 없는 사용자 접근:", user?.user_id);
      message.error("관리자 권한이 필요합니다");
      return;
    }

    logger.info("관리자 컴포넌트 초기화:", user?.user_id);

    // 날짜 범위가 없으면 기본값 설정 (최근 7일)
    if (!dateRange || !dateRange.length) {
      setDefaultDateRange(7);
    } else {
      // 날짜 범위가 있으면 데이터 로드
      fetchDashboards(dateRange[0], dateRange[1], true);
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      logger.info("관리자 컴포넌트 언마운트");
    };
  }, [user, dateRange, fetchDashboards, setDefaultDateRange, logger]);

  // 새로고침 핸들러
  const handleRefresh = () => {
    if (dateRange && dateRange.length === 2) {
      fetchDashboards(dateRange[0], dateRange[1], true);
    } else {
      setDefaultDateRange(7);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <Title level={4} style={FONT_STYLES.TITLE.MEDIUM}>
          관리자 대시보드
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          새로고침
        </Button>
      </div>

      {/* 대시보드 테이블 - 관리자 권한으로 표시 */}
      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        isAdminPage={true}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default AdminModule;
