// src/hooks/useDashboardModals.js
import { useState } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';

/**
 * 대시보드 모달 상태 관리 훅
 * @returns {Object} 모달 관련 상태 및 함수들
 */
const useDashboardModals = () => {
  const [statusForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [detailForm] = Form.useForm();

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(null);

  /**
   * 상태 변경 모달 열기
   * @param {Object} dashboard - 대시보드 데이터
   */
  const openStatusModal = (dashboard) => {
    setCurrentDashboard(dashboard);
    statusForm.setFieldsValue({
      status: dashboard.status,
    });
    setStatusModalVisible(true);
  };

  /**
   * 상태 변경 모달 닫기
   */
  const closeStatusModal = () => {
    setStatusModalVisible(false);
    statusForm.resetFields();
  };

  /**
   * 배차 모달 열기
   */
  const openAssignModal = () => {
    setAssignModalVisible(true);
  };

  /**
   * 배차 모달 닫기
   */
  const closeAssignModal = () => {
    setAssignModalVisible(false);
    assignForm.resetFields();
  };

  /**
   * 상세 정보 드로어 열기
   * @param {Object} dashboard - 대시보드 데이터
   */
  const openDetailDrawer = (dashboard) => {
    setCurrentDashboard(dashboard);
    setDetailVisible(true);

    if (dashboard) {
      detailForm.setFieldsValue({
        ...dashboard,
        eta: dashboard.eta ? dayjs(dashboard.eta) : null,
        create_time: dashboard.create_time
          ? dayjs(dashboard.create_time)
          : null,
        depart_time: dashboard.depart_time
          ? dayjs(dashboard.depart_time)
          : null,
        complete_time: dashboard.complete_time
          ? dayjs(dashboard.complete_time)
          : null,
      });
    }
  };

  /**
   * 상세 정보 드로어 닫기
   */
  const closeDetailDrawer = () => {
    setDetailVisible(false);
    detailForm.resetFields();
  };

  return {
    // 폼 인스턴스
    statusForm,
    assignForm,
    detailForm,

    // 상태값
    statusModalVisible,
    assignModalVisible,
    detailVisible,
    currentDashboard,

    // 핸들러 함수
    setCurrentDashboard,
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailDrawer,
    closeDetailDrawer,
  };
};

export default useDashboardModals;
