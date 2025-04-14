import React, { useState, useEffect } from 'react';
import { Card, Button, notification, Space, Popconfirm, message } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  CarOutlined,
  SyncOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import DateFilterPanel from '../components/dashboard/DateFilterPanel';
import StatusFilterPanel from '../components/dashboard/StatusFilterPanel';
import SummaryCards from '../components/dashboard/SummaryCards';
import OrdersTable from '../components/dashboard/OrdersTable';
import OrderDetailModal from '../components/dashboard/OrderDetailModal';
import NewOrderModal from '../components/dashboard/NewOrderModal';
import EditOrderModal from '../components/dashboard/EditOrderModal';
import StatusChangeModal from '../components/dashboard/StatusChangeModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';

import {
  getDashboardList,
  getDashboardDetail,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  updateStatus,
  assignDriver,
  assignMultiDrivers,
  searchDashboard,
} from '../api/DashboardService';
import { formatDate, getTodayDate, getDaysAgo } from '../utils/Helpers';
import { isAdmin } from '../utils/Auth';

// CSS 임포트
import './DashboardPage.css';

/**
 * 대시보드 메인 페이지 컴포넌트
 */
const DashboardPage = () => {
  // API 요청용 날짜 필터 (서버 사이드 필터링)
  const [dateFilters, setDateFilters] = useState({
    dateRange: [getTodayDate(), getTodayDate()],
    page: 1,
    pageSize: 10,
  });

  // 검색 필터 (별도의 API 호출)
  const [searchFilters, setSearchFilters] = useState({
    keyword: '',
    page: 1,
    pageSize: 10,
    isSearchMode: false,
  });

  // 클라이언트 필터 (클라이언트 사이드 필터링)
  const [clientFilters, setClientFilters] = useState({
    status: null,
    department: null,
    warehouse: null,
  });

  // 기타 상태 관리
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [newOrderVisible, setNewOrderVisible] = useState(false);
  const [editOrderVisible, setEditOrderVisible] = useState(false);
  const [statusChangeVisible, setStatusChangeVisible] = useState(false);
  const [assignDriverVisible, setAssignDriverVisible] = useState(false);
  const [isMultipleAssign, setIsMultipleAssign] = useState(false);

  // React Query 클라이언트
  const queryClient = useQueryClient();

  // 날짜 필터 기반 목록 조회 쿼리
  const {
    data: dashboardData,
    isLoading: isLoadingList,
    error: listError,
    refetch: refetchList,
  } = useQuery(
    ['dashboardList', dateFilters],
    () => {
      // API 호출을 위한 파라미터 구성 - 날짜 필터와 필수 파라미터 추가
      const today = getTodayDate();

      const params = {
        // 날짜 범위가 없으면 오늘 날짜로 설정 (필수 파라미터)
        start: dateFilters.dateRange?.[0] || today,
        end: dateFilters.dateRange?.[1] || today,
        page: dateFilters.page,
        limit: dateFilters.pageSize,
      };

      console.log('대시보드 목록 조회 API 요청 파라미터:', params);

      return getDashboardList(params);
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      // 오류 발생 시 자동 재시도하지 않음
      retry: false,
      // 검색 모드일 때는 자동 실행 안함
      enabled: !searchFilters.isSearchMode,
      // 쿼리 실패 시 로그 및 에러 처리
      onError: (error) => {
        console.error('대시보드 목록 조회 실패:', error);
        if (error.error_code === 'UNAUTHORIZED') {
          // 인증 오류는 Client.js의 인터셉터에서 처리됨
          console.log('인증 오류, 로그인 페이지로 리다이렉션합니다.');
        } else {
          message.error(
            error.message || '데이터를 불러오는 중 오류가 발생했습니다.'
          );
        }
      },
    }
  );

  // 검색 기반 목록 조회 쿼리 (별도 API)
  const {
    data: searchData,
    isLoading: isLoadingSearch,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery(
    ['dashboardSearch', searchFilters],
    () => {
      // 검색어가 없으면 API 호출 안함
      if (!searchFilters.keyword) {
        return { success: true, data: { items: [], total: 0 } };
      }

      const params = {
        search: searchFilters.keyword,
        page: searchFilters.page,
        limit: searchFilters.pageSize,
      };

      console.log('대시보드 검색 API 요청 파라미터:', params);

      return searchDashboard(params);
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: false,
      // 검색 모드이고 검색어가 있을 때만 활성화
      enabled: searchFilters.isSearchMode && !!searchFilters.keyword,
      onError: (error) => {
        console.error('대시보드 검색 실패:', error);
        if (error.error_code === 'UNAUTHORIZED') {
          console.log('인증 오류, 로그인 페이지로 리다이렉션합니다.');
        } else {
          message.error(error.message || '검색 중 오류가 발생했습니다.');
        }
      },
    }
  );

  // 현재 활성화된 데이터 (검색 모드 또는 일반 목록 모드)
  const activeData = searchFilters.isSearchMode
    ? searchData?.data
    : dashboardData?.data;

  // 현재 로딩 상태
  const isLoading = searchFilters.isSearchMode
    ? isLoadingSearch
    : isLoadingList;

  // 클라이언트 측 필터링 적용
  const applyClientFilters = (data) => {
    if (!data || !data.items) return [];

    return data.items.filter((item) => {
      // 상태 필터 적용
      if (clientFilters.status && item.status !== clientFilters.status) {
        return false;
      }

      // 부서 필터 적용
      if (
        clientFilters.department &&
        item.department !== clientFilters.department
      ) {
        return false;
      }

      // 창고 필터 적용
      if (
        clientFilters.warehouse &&
        item.warehouse !== clientFilters.warehouse
      ) {
        return false;
      }

      return true;
    });
  };

  // 필터링된 데이터
  const filteredData = activeData ? applyClientFilters(activeData) : [];

  // 날짜 필터 적용 핸들러 (API 요청 트리거)
  const handleDateFilterApply = (newFilters) => {
    // 검색 모드에서 날짜 필터 모드로 전환
    if (searchFilters.isSearchMode) {
      setSearchFilters({
        ...searchFilters,
        isSearchMode: false,
      });
    }

    setDateFilters({
      ...dateFilters,
      dateRange: newFilters.dateRange,
      page: 1, // 필터 변경 시 첫 페이지로 이동
    });
  };

  // 검색 적용 핸들러 (API 요청 트리거)
  const handleSearchApply = (newFilters) => {
    // 검색 모드로 전환
    setSearchFilters({
      ...searchFilters,
      keyword: newFilters.keyword,
      page: 1,
      isSearchMode: true,
    });
  };

  // 상태 필터 적용 핸들러 (클라이언트 필터링)
  const handleStatusFilterApply = (newFilters) => {
    setClientFilters(newFilters);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page, pageSize) => {
    if (searchFilters.isSearchMode) {
      // 검색 모드에서는 검색 필터 업데이트
      setSearchFilters({
        ...searchFilters,
        page,
        pageSize,
      });
    } else {
      // 일반 모드에서는 날짜 필터 업데이트
      setDateFilters({
        ...dateFilters,
        page,
        pageSize,
      });
    }
  };

  // 필터 초기화 핸들러
  const handleFilterReset = () => {
    setClientFilters({
      status: null,
      department: null,
      warehouse: null,
    });
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    if (searchFilters.isSearchMode) {
      refetchSearch();
    } else {
      refetchList();
    }
  };

  // 행 선택 핸들러
  const handleSelectionChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // 행 클릭 핸들러
  const handleRowClick = (record) => {
    setSelectedOrder(record);
    setDetailVisible(true);
  };

  // 신규 주문 모달 표시
  const handleNewOrder = () => {
    setNewOrderVisible(true);
  };

  // 드라이버 배정 모달 표시
  const handleMultiAssignDriver = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('드라이버를 배정할 주문을 선택해주세요.');
      return;
    }
    setIsMultipleAssign(true);
    setAssignDriverVisible(true);
  };

  // 상태 변경 모달 표시
  const handleMultiStatusChange = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('상태를 변경할 주문을 선택해주세요.');
      return;
    }
    setStatusChangeVisible(true);
  };

  // 상태별 주문 수 집계
  const countByStatus = () => {
    if (!filteredData) {
      return {
        total: 0,
        waiting: 0,
        inProgress: 0,
        complete: 0,
        issue: 0,
        cancel: 0,
      };
    }

    let waiting = 0,
      inProgress = 0,
      complete = 0,
      issue = 0,
      cancel = 0;

    filteredData.forEach((item) => {
      switch (item.status) {
        case 'WAITING':
          waiting++;
          break;
        case 'IN_PROGRESS':
          inProgress++;
          break;
        case 'COMPLETE':
          complete++;
          break;
        case 'ISSUE':
          issue++;
          break;
        case 'CANCEL':
          cancel++;
          break;
        default:
          break;
      }
    });

    return {
      total: filteredData.length,
      waiting,
      inProgress,
      complete,
      issue,
      cancel,
    };
  };

  // 페이지네이션 설정
  const paginationConfig = {
    current: searchFilters.isSearchMode ? searchFilters.page : dateFilters.page,
    pageSize: searchFilters.isSearchMode
      ? searchFilters.pageSize
      : dateFilters.pageSize,
    total: activeData?.total || 0,
    showSizeChanger: true,
    showTotal: (total) => `총 ${total}개 주문`,
    onChange: handlePageChange,
    onShowSizeChange: handlePageChange,
  };

  return (
    <div className="dashboard-container">
      <div className="card-container">
        <Card
          title="주문 대시보드"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleNewOrder}
              >
                주문 추가
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                새로고침
              </Button>
            </Space>
          }
        >
          {/* 날짜 필터 및 검색 패널 */}
          <DateFilterPanel
            onDateFilter={handleDateFilterApply}
            onSearch={handleSearchApply}
            defaultValues={{
              dateRange: dateFilters.dateRange,
              keyword: searchFilters.keyword,
            }}
          />

          {/* 상태 필터 패널 */}
          <StatusFilterPanel
            onFilter={handleStatusFilterApply}
            onReset={handleFilterReset}
          />

          {/* 상태별 요약 카드 */}
          <SummaryCards stats={countByStatus()} loading={isLoading} />

          {/* 도구 모음 */}
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button
                icon={<CarOutlined />}
                onClick={handleMultiAssignDriver}
                disabled={selectedRowKeys.length === 0}
              >
                기사 배정
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={handleMultiStatusChange}
                disabled={selectedRowKeys.length === 0}
              >
                상태 변경
              </Button>
              {isAdmin() && (
                <Popconfirm
                  title="선택한 주문을 삭제하시겠습니까?"
                  onConfirm={() => {
                    message.info('삭제 기능 구현 예정');
                  }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedRowKeys.length === 0}
                  >
                    주문 삭제
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>

          {/* 주문 테이블 */}
          <OrdersTable
            data={filteredData}
            loading={isLoading}
            onRowClick={handleRowClick}
            onSelectionChange={handleSelectionChange}
            pagination={paginationConfig}
          />
        </Card>
      </div>

      {/* 모달 컴포넌트들 */}
      {selectedOrder && (
        <OrderDetailModal
          visible={detailVisible}
          order={selectedOrder}
          onClose={() => setDetailVisible(false)}
          onEdit={() => {
            setDetailVisible(false);
            setEditOrderVisible(true);
          }}
        />
      )}

      <NewOrderModal
        visible={newOrderVisible}
        onClose={() => setNewOrderVisible(false)}
        onSuccess={() => {
          setNewOrderVisible(false);
          refetchList();
        }}
      />

      {selectedOrder && (
        <EditOrderModal
          visible={editOrderVisible}
          order={selectedOrder}
          onClose={() => setEditOrderVisible(false)}
          onSuccess={() => {
            setEditOrderVisible(false);
            refetchList();
          }}
        />
      )}

      {selectedOrder && (
        <StatusChangeModal
          visible={statusChangeVisible}
          orderIds={selectedRowKeys}
          currentStatus={selectedOrder.status}
          onClose={() => setStatusChangeVisible(false)}
          onSuccess={() => {
            setStatusChangeVisible(false);
            setSelectedRowKeys([]);
            refetchList();
          }}
        />
      )}

      <AssignDriverModal
        visible={assignDriverVisible}
        orderIds={selectedRowKeys}
        isMultiple={isMultipleAssign}
        onClose={() => {
          setAssignDriverVisible(false);
          setIsMultipleAssign(false);
        }}
        onSuccess={() => {
          setAssignDriverVisible(false);
          setIsMultipleAssign(false);
          setSelectedRowKeys([]);
          refetchList();
        }}
      />
    </div>
  );
};

export default DashboardPage;
