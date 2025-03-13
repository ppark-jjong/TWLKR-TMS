// frontend/src/pages/DashboardPage.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layout,
  DatePicker,
  Space,
  Button,
  Tooltip,
  Popconfirm,
  Empty,
  Modal,
  Input,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
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
const { confirm } = Modal;

/**
 * 통합 대시보드 페이지 컴포넌트
 * 배송 주문 목록 조회, 필터링, 배차 처리, 삭제(관리자) 등 기능 제공
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
  const [initialized, setInitialized] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // 요청 중복 방지를 위한 플래그
  const isRefreshingRef = useRef(false);
  const isSearchingRef = useRef(false);
  const isLoadingDetailRef = useRef(false);

  // 필터링 상태
  const [typeFilter, setTypeFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState(null);
  const [orderNoSearch, setOrderNoSearch] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.user_role === 'ADMIN'; // 관리자 권한 여부

  const {
    dashboards,
    loading,
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
    searchMode,
  } = useDashboard();

  const pageSize = 50;

  // 컴포넌트 마운트 시 초기화 완료 표시
  useEffect(() => {
    setInitialized(true);
  }, []);

  // 컴포넌트 언마운트 시 정리 로직 추가
  useEffect(() => {
    return () => {
      // 진행 중인 요청 취소
      cancelAllPendingRequests();
    };
  }, []);

  // 날짜 범위가 설정되면 대시보드 데이터 로드 (최초 1회만)
  useEffect(() => {
    if (
      dateRange &&
      dateRange[0] &&
      dateRange[1] &&
      !dateRangeLoading &&
      initialized &&
      !searchMode
    ) {
      loadDashboardData(dateRange[0], dateRange[1], false);
    }
  }, [dateRange, dateRangeLoading, initialized, searchMode]);

  // 대시보드 데이터 로드 함수 - 관리자/일반 구분
  const loadDashboardData = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      // 이미 로딩 중인 경우 중복 요청 방지
      if (isRefreshingRef.current && !forceRefresh) {
        console.log('이미 데이터를 로드 중입니다.');
        return null;
      }

      const key = MessageKeys.DASHBOARD.LOAD;

      try {
        // 로딩 플래그 설정
        isRefreshingRef.current = true;
        setCurrentPage(1); // 데이터 조회 시 첫 페이지로 이동

        // 검색 모드에서는 강제 새로고침이 아니라면 요청 스킵
        if (searchMode && !forceRefresh) {
          console.log('검색 모드에서는 데이터를 재요청하지 않습니다.');
          return null;
        }

        message.loading('데이터 조회 중...', key);
        console.log(
          '대시보드 데이터 조회 시작:',
          startDate.format('YYYY-MM-DD'),
          '~',
          endDate.format('YYYY-MM-DD')
        );

        // 데이터 조회 요청
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
      } finally {
        // 로딩 플래그 해제
        isRefreshingRef.current = false;
      }
    },
    [fetchDashboards, searchMode]
  );

  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    // 이미 로딩 중인 경우 중복 요청 방지
    if (isRefreshingRef.current) {
      console.log('이미 새로고침 중입니다.');
      return;
    }

    console.log('새로고침 요청');
    if (dateRange[0] && dateRange[1]) {
      loadDashboardData(dateRange[0], dateRange[1], true); // 강제 새로고침
    }
  }, [dateRange, loadDashboardData]);

  // 삭제 핸들러 (관리자 전용)
  const handleDelete = useCallback(async () => {
    // 관리자 권한 검증
    if (!isAdmin) {
      message.error(
        '삭제 권한이 없습니다. 관리자만 이 기능을 사용할 수 있습니다.'
      );
      return;
    }

    const key = MessageKeys.DASHBOARD.DELETE;

    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    confirm({
      title: '선택한 항목을 삭제하시겠습니까?',
      content: `총 ${selectedRows.length}개 항목이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      okText: '삭제',
      cancelText: '취소',
      onOk: async () => {
        try {
          message.loading('삭제 처리 중...', key);
          console.log(
            '삭제 요청:',
            selectedRows.map((row) => row.dashboard_id)
          );

          await DashboardService.deleteDashboards(
            selectedRows.map((row) => row.dashboard_id)
          );

          // Context 상태 업데이트
          removeDashboards(selectedRows.map((row) => row.dashboard_id));
          setSelectedRows([]);
          message.loadingToSuccess(
            `선택한 ${selectedRows.length}개 항목이 삭제되었습니다`,
            key
          );
        } catch (error) {
          console.error('삭제 실패:', error);

          // 사용자 친화적인 오류 메시지
          if (error.response?.status === 403) {
            message.loadingToError(
              '삭제 권한이 없습니다. 관리자 권한이 필요합니다.',
              key
            );
          } else if (error.response?.status === 404) {
            message.loadingToError(
              '일부 항목을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.',
              key
            );
            // 화면 새로고침
            handleRefresh();
          } else {
            message.loadingToError(
              '삭제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
              key
            );
          }
        }
      },
    });
  }, [selectedRows, isAdmin, removeDashboards, handleRefresh]);

  // 행 클릭 핸들러
  const handleRowClick = useCallback(
    async (record) => {
      // 이미 상세 정보를 로딩 중인 경우 중복 요청 방지
      if (isLoadingDetailRef.current) {
        console.log('이미 상세 정보를 로딩 중입니다.');
        return;
      }

      const key = MessageKeys.DASHBOARD.DETAIL;
      try {
        // 로딩 플래그 설정
        isLoadingDetailRef.current = true;
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
      } finally {
        // 로딩 플래그 해제
        isLoadingDetailRef.current = false;
      }
    },
    [handleRefresh]
  );

  // 대시보드 생성 성공 핸들러
  const handleCreateSuccess = useCallback(() => {
    console.log('대시보드 생성 성공');
    setShowCreateModal(false);
    message.success('새로운 주문이 성공적으로 등록되었습니다.');
    handleRefresh();
  }, [handleRefresh]);

  // 배차 성공 핸들러
  const handleAssignSuccess = useCallback(() => {
    console.log('배차 성공');
    setShowAssignModal(false);
    setSelectedRows([]);
    message.success('선택한 주문에 배차가 완료되었습니다.');
    handleRefresh();
  }, [handleRefresh]);

  // 상세 모달 처리 성공 핸들러
  const handleDetailSuccess = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // 배차 버튼 클릭 핸들러 - 권한별 차등 적용
  const handleAssignClick = useCallback(() => {
    if (selectedRows.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }

    // 관리자는 모든 상태의 주문 배차 가능
    if (isAdmin) {
      setShowAssignModal(true);
      return;
    }

    // 일반 사용자는 대기 상태인 주문만 배차 가능
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
  }, [selectedRows, isAdmin]);

  // 주문번호 검색 핸들러 - API 호출 방식
  const handleOrderNoSearch = useCallback(
    async (value) => {
      // 이미 검색 중인 경우 중복 요청 방지
      if (isSearchingRef.current) {
        console.log('이미 검색 중입니다.');
        return;
      }

      if (!value || value.trim() === '') {
        // 검색어가 비어있으면 검색 모드 초기화
        resetSearchMode();
        setOrderNoSearch('');
        setSearchInput('');
        return;
      }

      setOrderNoSearch(value);
      setCurrentPage(1);

      // 검색 플래그 설정
      isSearchingRef.current = true;
      setSearchLoading(true);

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
      } finally {
        // 검색 플래그 해제
        isSearchingRef.current = false;
        setSearchLoading(false);
      }
    },
    [searchByOrderNo, resetSearchMode]
  );

  // 검색 입력 변경 핸들러
  const handleSearchInputChange = useCallback(
    (e) => {
      setSearchInput(e.target.value);
      // 입력이 비어있으면 검색 모드 초기화
      if (!e.target.value) {
        resetSearchMode();
        setOrderNoSearch('');
      }
    },
    [resetSearchMode]
  );

  // 엔터 키 핸들러
  const handleSearchKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && searchInput.trim()) {
        handleOrderNoSearch(searchInput);
      }
    },
    [searchInput, handleOrderNoSearch]
  );

  // 필터 핸들러
  const handleTypeFilter = useCallback((value) => {
    setTypeFilter(value);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  }, []);

  const handleDepartmentFilter = useCallback((value) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
  }, []);

  const handleWarehouseFilter = useCallback((value) => {
    setWarehouseFilter(value);
    setCurrentPage(1);
  }, []);

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
    setSearchInput('');
    setCurrentPage(1);
  }, []);

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space
          size="large"
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space>
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
            {/* 검색바를 DateRangePicker와 같은 라인에 배치 */}
            <Input.Search
              placeholder="주문번호 검색"
              value={searchInput}
              onChange={handleSearchInputChange}
              onSearch={handleOrderNoSearch}
              onKeyPress={handleSearchKeyPress}
              style={{ width: 200 }}
              size="large"
              enterButton
              loading={searchLoading}
              allowClear
            />
          </Space>

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
            {/* 관리자만 삭제 버튼 표시 */}
            {isAdmin && (
              <Popconfirm
                title="선택한 항목을 삭제하시겠습니까?"
                description={`총 ${selectedRows.length}개 항목이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
                onConfirm={handleDelete}
                okText="삭제"
                cancelText="취소"
                disabled={selectedRows.length === 0}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedRows.length === 0}
                  size="large"
                >
                  삭제
                </Button>
              </Popconfirm>
            )}
            <Tooltip title="새로고침">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                size="large"
              />
            </Tooltip>
          </Space>
        </Space>
        {/* 검색 모드 표시 */}
        {searchMode && (
          <Alert
            message={`주문번호로 검색 중: "${orderNoSearch}"`}
            type="info"
            showIcon
            action={
              <Button size="small" onClick={resetSearchMode}>
                검색 초기화
              </Button>
            }
            style={{ marginTop: '8px' }}
          />
        )}
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
          isAdminPage={isAdmin} // 관리자 여부에 따라 테이블 스타일 변경
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
          isAdmin={isAdmin} // 관리자 여부 전달
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;
