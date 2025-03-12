// frontend/src/pages/DashboardPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, DatePicker, Space, Button, Tooltip, Empty } from 'antd';
import { ReloadOutlined, PlusOutlined, CarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import { FONT_STYLES } from '../utils/Constants';
import { useDateRange } from '../utils/useDateRange';
import { cancelAllPendingRequests } from '../utils/AxiosConfig';

const { RangePicker } = DatePicker;

/**
 * 대시보드 페이지 컴포넌트
 * 배송 주문 목록 조회, 필터링, 배차 처리 등 기능 제공
 */
const DashboardPage = () => {
  // 날짜 범위 커스텀 훅 사용
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(30); // 기본 30일 범위로 설정

  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 필터링 상태
  const [typeFilter, setTypeFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState(null);
  const [orderNoSearch, setOrderNoSearch] = useState('');

  const { user } = useAuth();
  const {
    dashboards,
    loading,
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard,
    updateMultipleDashboards,
    searchMode,
  } = useDashboard();

  const pageSize = 50;

  // 컴포넌트 언마운트 시 정리 로직 추가
  useEffect(() => {
    return () => {
      // 진행 중인 요청 취소
      cancelAllPendingRequests();
    };
  }, []);

  // 대시보드 데이터 로드 (메모이제이션)
  const loadDashboardData = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      const key = MessageKeys.DASHBOARD.LOAD;
      try {
        if (!startDate || !endDate) {
          console.error('유효하지 않은 날짜 범위:', {
            startDate,
            endDate,
          });
          return null;
        }

        setCurrentPage(1); // 데이터 조회 시 첫 페이지로 이동

        // 강제 새로고침이 아니고 이미 데이터가 있는 경우, 검색 모드인 경우만 기존 데이터 유지
        if (!forceRefresh && dashboards.length > 0 && searchMode) {
          return { items: dashboards, date_range: null };
        }

        message.loading('데이터 조회 중...', key);
        console.log(
          '대시보드 데이터 조회 시작:',
          startDate.format('YYYY-MM-DD'),
          '~',
          endDate.format('YYYY-MM-DD')
        );

        const response = await fetchDashboards(
          startDate,
          endDate,
          forceRefresh
        );

        // 필터 초기화 (강제 새로고침 시에만)
        if (forceRefresh) {
          resetFilters();
        }

        const items = response?.items || [];
        if (items.length > 0) {
          message.loadingToSuccess('데이터를 조회했습니다', key);
        } else {
          message.loadingToInfo('조회된 데이터가 없습니다', key);
        }

        return response;
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
        message.loadingToError(
          '데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
        return null;
      }
    },
    [dashboards, fetchDashboards, resetFilters, searchMode]
  );

  // 날짜 범위가 설정되면 대시보드 데이터 로드
  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1] && !dateRangeLoading) {
      loadDashboardData(dateRange[0], dateRange[1], false);
    }
  }, [dateRange, dateRangeLoading, loadDashboardData]);

  // 새로고침 핸들러
  const handleRefresh = () => {
    console.log('새로고침 요청');
    if (dateRange[0] && dateRange[1]) {
      loadDashboardData(dateRange[0], dateRange[1], true); // 강제 새로고침
    }
  };

  // 행 클릭 핸들러
  const handleRowClick = async (record) => {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      console.log('행 클릭:', record);

      const detailData = await DashboardService.getDashboardDetail(
        record.dashboard_id
      );
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
      message.loadingToSuccess('상세 정보를 조회했습니다', key);
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);

      // 사용자 친화적인 오류 메시지 표시
      if (error.response?.status === 404) {
        message.loadingToError(
          '해당 주문 정보를 찾을 수 없습니다. 삭제되었거나 존재하지 않는 주문입니다.',
          key
        );
        // 목록 새로고침
        handleRefresh();
      } else {
        message.loadingToError(
          '상세 정보 조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      }
    }
  };

  // 대시보드 생성 성공 핸들러
  const handleCreateSuccess = () => {
    console.log('대시보드 생성 성공');
    setShowCreateModal(false);
    message.success('새로운 주문이 성공적으로 등록되었습니다.');
    handleRefresh();
  };

  // 배차 성공 핸들러
  const handleAssignSuccess = () => {
    console.log('배차 성공');
    setShowAssignModal(false);
    setSelectedRows([]);
    message.success('선택한 주문에 배차가 완료되었습니다.');
    handleRefresh();
  };

  // 상세 모달 처리 성공 핸들러
  const handleDetailSuccess = () => {
    handleRefresh();
  };

  // 배차 버튼 클릭 핸들러
  const handleAssignClick = () => {
    if (selectedRows.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }

    // 선택된 항목 중 대기 상태가 아닌 것이 있는지 확인
    const invalidItems = selectedRows.filter((row) => row.status !== 'WAITING');
    if (invalidItems.length > 0) {
      const orderNos = invalidItems.map((item) => item.order_no).join(', ');
      message.error(
        `다음 주문은 대기 상태가 아니어서 배차할 수 없습니다: ${orderNos}`,
        null,
        5 // 더 긴 표시 시간 설정
      );
      return;
    }

    setShowAssignModal(true);
  };

  // 주문번호 검색 핸들러 - API 호출 방식
  const handleOrderNoSearch = async (value) => {
    if (!value || value.trim() === '') {
      // 검색어가 비어있으면 검색 모드 초기화
      resetSearchMode();
      loadDashboardData(dateRange[0], dateRange[1], true);
      setOrderNoSearch('');
      return;
    }

    setOrderNoSearch(value);
    setCurrentPage(1);

    // 검색 중임을 표시
    const key = MessageKeys.DASHBOARD.LOAD;
    message.loading('주문번호 검색 중...', key);

    try {
      // searchByOrderNo 함수 사용(DashboardContext에서 제공)
      const searchResults = await searchByOrderNo(value);

      if (
        searchResults &&
        searchResults.items &&
        searchResults.items.length > 0
      ) {
        message.loadingToSuccess(
          `검색 결과: ${searchResults.items.length}건`,
          key
        );
      } else {
        message.loadingToInfo(
          `주문번호 "${value}"에 대한 검색 결과가 없습니다`,
          key
        );
      }
    } catch (error) {
      console.error('주문번호 검색 실패:', error);
      message.loadingToError(
        '주문번호 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );
    }
  };

  // 필터 핸들러
  const handleTypeFilter = (value) => {
    setTypeFilter(value);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  const handleDepartmentFilter = (value) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
  };

  const handleWarehouseFilter = (value) => {
    setWarehouseFilter(value);
    setCurrentPage(1);
  };

  // 필터 초기화
  const resetFilters = () => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
    setCurrentPage(1);
  };

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space
          size="large"
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            style={{ width: 350 }}
            size="large"
            allowClear={false}
            disabledDate={disabledDate}
            ranges={{
              오늘: [dayjs(), dayjs()],
              '최근 3일': [dayjs().subtract(2, 'day'), dayjs()],
              '최근 7일': [dayjs().subtract(6, 'day'), dayjs()],
              '최근 30일': [dayjs().subtract(29, 'day'), dayjs()],
            }}
          />

          <Space size="middle">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              size="large"
            >
              신규 등록
            </Button>
            <Button
              icon={<CarOutlined />}
              onClick={handleAssignClick}
              disabled={selectedRows.length === 0}
              size="large"
            >
              배차
            </Button>
            <Tooltip title="새로고침">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                size="large"
              />
            </Tooltip>
          </Space>
        </Space>
      </div>

      {loading || dateRangeLoading ? (
        <LoadingSpin tip="데이터 불러오는 중..." />
      ) : dashboards.length === 0 ? (
        <Empty description="조회된 데이터가 없습니다" />
      ) : (
        <DashboardTable
          dataSource={dashboards}
          loading={loading}
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          onRowClick={handleRowClick}
          onRefresh={handleRefresh}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          isAdminPage={false}
          // 필터링 관련 props
          typeFilter={typeFilter}
          departmentFilter={departmentFilter}
          warehouseFilter={warehouseFilter}
          orderNoSearch={orderNoSearch}
          onTypeFilterChange={handleTypeFilter}
          onDepartmentFilterChange={handleDepartmentFilter}
          onWarehouseFilterChange={handleWarehouseFilter}
          onOrderNoSearchChange={handleOrderNoSearch}
          onResetFilters={resetFilters}
        />
      )}

      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          userDepartment={user?.user_department}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          visible={showAssignModal}
          onCancel={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
          selectedRows={selectedRows}
        />
      )}

      {showDetailModal && selectedDashboard && (
        <DashboardDetailModal
          visible={showDetailModal}
          dashboard={selectedDashboard}
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedDashboard(null);
          }}
          onSuccess={handleDetailSuccess}
          isAdmin={false}
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;
