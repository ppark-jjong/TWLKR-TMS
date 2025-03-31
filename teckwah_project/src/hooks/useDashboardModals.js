// src/hooks/useDashboardModals.js
import { useState } from "react";
import { Form } from "antd";
import dayjs from "dayjs";

/**
 * 대시보드 관련 모달 상태 관리 훅
 */
const useDashboardModals = () => {
  // 폼 인스턴스
  const [statusForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [detailForm] = Form.useForm();

  // 모달 상태
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(null);

  // 상태 변경 모달
  const openStatusModal = (dashboard) => {
    setCurrentDashboard(dashboard);
    statusForm.setFieldsValue({ status: dashboard.status });
    setStatusModalVisible(true);
  };

  const closeStatusModal = () => {
    setStatusModalVisible(false);
    statusForm.resetFields();
  };

  // 배차 모달
  const openAssignModal = () => {
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const closeAssignModal = () => {
    setAssignModalVisible(false);
    assignForm.resetFields();
  };

  // 상세 정보 모달
  const openDetailModal = (dashboard) => {
    if (!dashboard) return;

    setCurrentDashboard(dashboard);
    detailForm.resetFields();

    // 날짜 필드를 dayjs 객체로 변환
    const formValues = {
      ...dashboard,
      eta: dashboard.eta ? dayjs(dashboard.eta) : null,
      updated_at: dashboard.updated_at ? dayjs(dashboard.updated_at) : null,
    };

    detailForm.setFieldsValue(formValues);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    detailForm.resetFields();
  };

  return {
    statusForm,
    assignForm,
    detailForm,
    statusModalVisible,
    assignModalVisible,
    detailModalVisible,
    currentDashboard,
    setCurrentDashboard,
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailModal,
    closeDetailModal,
  };
};

export default useDashboardModals;
