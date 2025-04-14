import React, { useState, useEffect } from "react";
import { Card, Button, notification, Space, Popconfirm, message } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  CarOutlined,
  SyncOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import FilterPanel from "../components/dashboard/FilterPanel";
import SummaryCards from "../components/dashboard/SummaryCards";
import OrdersTable from "../components/dashboard/OrdersTable";
import OrderDetailModal from "../components/dashboard/OrderDetailModal";
import NewOrderModal from "../components/dashboard/NewOrderModal";
import EditOrderModal from "../components/dashboard/EditOrderModal";
import StatusChangeModal from "../components/dashboard/StatusChangeModal";
import AssignDriverModal from "../components/dashboard/AssignDriverModal";

import {
  getDashboardList,
  getDashboardDetail,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  updateStatus,
  assignDriver,
  assignMultiDrivers,
} from "../api/DashboardService";
import { formatDate, getTodayDate, getDaysAgo } from "../utils/Helpers";
import { isAdmin } from "../utils/Auth";

/**
 * 대시보드 메인 페이지 컴포넌트
 */
const DashboardPage = () => {
  // 상태 관리
  const [filters, setFilters] = useState({
    dateRange: [getDaysAgo(7), getTodayDate()],
    status: null,
    department: null,
    warehouse: null,
    keyword: "",
    page: 1,
    pageSize: 10,
  });
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

  // 목록 조회 쿼리
  const {
    data: dashboardData,
    isLoading: isLoadingList,
    error: listError,
    refetch: refetchList,
  } = useQuery(
    ["dashboardList", filters],
    () => {
      // API 호출을 위한 파라미터 구성
      const params = {
        start: filters.dateRange?.[0],
        end: filters.dateRange?.[1],
        page: filters.page,
        limit: filters.pageSize,
      };

      if (filters.keyword) {
        params.search = filters.keyword;
      }

      return getDashboardList(params);
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  // 상세 조회 쿼리
  const {
    data: orderDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useQuery(
    ["dashboardDetail", selectedOrder?.dashboard_id],
    () => getDashboardDetail(selectedOrder?.dashboard_id),
    {
      enabled: !!selectedOrder?.dashboard_id && detailVisible,
      refetchOnWindowFocus: false,
    }
  );

  // 주문 생성 뮤테이션
  const createOrderMutation = useMutation(createDashboard, {
    onSuccess: (data) => {
      if (data.success) {
        notification.success({
          message: "주문 등록 성공",
          description: "새로운 주문이 등록되었습니다.",
        });
        setNewOrderVisible(false);
        queryClient.invalidateQueries("dashboardList");
      } else {
        notification.error({
          message: "주문 등록 실패",
          description: data.message || "주문 등록 중 오류가 발생했습니다.",
        });
      }
    },
    onError: (error) => {
      notification.error({
        message: "주문 등록 실패",
        description: error.message || "주문 등록 중 오류가 발생했습니다.",
      });
    },
  });

  // 주문 수정 뮤테이션
  const updateOrderMutation = useMutation(
    (data) => updateDashboard(data.dashboard_id, data),
    {
      onSuccess: (data) => {
        if (data.success) {
          notification.success({
            message: "주문 수정 성공",
            description: "주문 정보가 수정되었습니다.",
          });
          setEditOrderVisible(false);
          queryClient.invalidateQueries("dashboardList");
          queryClient.invalidateQueries([
            "dashboardDetail",
            selectedOrder?.dashboard_id,
          ]);
        } else {
          notification.error({
            message: "주문 수정 실패",
            description: data.message || "주문 수정 중 오류가 발생했습니다.",
          });
        }
      },
      onError: (error) => {
        notification.error({
          message: "주문 수정 실패",
          description: error.message || "주문 수정 중 오류가 발생했습니다.",
        });
      },
    }
  );

  // 주문 삭제 뮤테이션
  const deleteOrderMutation = useMutation(deleteDashboard, {
    onSuccess: (data) => {
      if (data.success) {
        notification.success({
          message: "주문 삭제 성공",
          description: "주문이 삭제되었습니다.",
        });
        setDetailVisible(false);
        queryClient.invalidateQueries("dashboardList");
      } else {
        notification.error({
          message: "주문 삭제 실패",
          description: data.message || "주문 삭제 중 오류가 발생했습니다.",
        });
      }
    },
    onError: (error) => {
      notification.error({
        message: "주문 삭제 실패",
        description: error.message || "주문 삭제 중 오류가 발생했습니다.",
      });
    },
  });

  // 상태 변경 뮤테이션
  const updateStatusMutation = useMutation(
    (data) =>
      updateStatus(data.id, {
        status: data.status,
        updated_by: data.updated_by,
        update_at: new Date().toISOString(),
      }),
    {
      onSuccess: (data) => {
        if (data.success) {
          notification.success({
            message: "상태 변경 성공",
            description: "주문 상태가 변경되었습니다.",
          });
          setStatusChangeVisible(false);
          queryClient.invalidateQueries("dashboardList");
          queryClient.invalidateQueries([
            "dashboardDetail",
            selectedOrder?.dashboard_id,
          ]);
        } else {
          notification.error({
            message: "상태 변경 실패",
            description: data.message || "상태 변경 중 오류가 발생했습니다.",
          });
        }
      },
      onError: (error) => {
        notification.error({
          message: "상태 변경 실패",
          description: error.message || "상태 변경 중 오류가 발생했습니다.",
        });
      },
    }
  );

  // 배차 처리 뮤테이션
  const assignDriverMutation = useMutation(
    (data) =>
      assignDriver(data.id, {
        driver_name: data.driver_name,
        driver_contact: data.driver_contact,
        updated_by: data.updated_by,
        update_at: new Date().toISOString(),
      }),
    {
      onSuccess: (data) => {
        if (data.success) {
          notification.success({
            message: "배차 처리 성공",
            description: "기사 정보가 업데이트되었습니다.",
          });
          setAssignDriverVisible(false);
          queryClient.invalidateQueries("dashboardList");
          queryClient.invalidateQueries([
            "dashboardDetail",
            selectedOrder?.dashboard_id,
          ]);
        } else {
          notification.error({
            message: "배차 처리 실패",
            description: data.message || "배차 처리 중 오류가 발생했습니다.",
          });
        }
      },
      onError: (error) => {
        notification.error({
          message: "배차 처리 실패",
          description: error.message || "배차 처리 중 오류가 발생했습니다.",
        });
      },
    }
  );

  // 다중 배차 처리 뮤테이션
  const assignMultiDriversMutation = useMutation(
    (data) =>
      assignMultiDrivers({
        ids: data.ids,
        driver_name: data.driver_name,
        driver_contact: data.driver_contact,
        updated_by: data.updated_by,
        update_at: new Date().toISOString(),
      }),
    {
      onSuccess: (data) => {
        if (data.success) {
          notification.success({
            message: "다중 배차 처리 성공",
            description: `${
              data.data.success_count
            }건의 주문에 기사 정보가 업데이트되었습니다.${
              data.data.failed_count > 0
                ? ` ${data.data.failed_count}건은 실패했습니다.`
                : ""
            }`,
          });
          setAssignDriverVisible(false);
          setSelectedRowKeys([]);
          queryClient.invalidateQueries("dashboardList");
        } else {
          notification.error({
            message: "다중 배차 처리 실패",
            description: data.message || "배차 처리 중 오류가 발생했습니다.",
          });
        }
      },
      onError: (error) => {
        notification.error({
          message: "다중 배차 처리 실패",
          description: error.message || "배차 처리 중 오류가 발생했습니다.",
        });
      },
    }
  );

  // 필터 적용 핸들러
  const handleFilterApply = (newFilters) => {
    setFilters({
      ...filters,
      ...newFilters,
      page: 1, // 필터 변경 시 첫 페이지로 이동
    });
  };

  // 필터 초기화 핸들러
  const handleFilterReset = () => {
    setFilters({
      dateRange: [getDaysAgo(7), getTodayDate()],
      status: null,
      department: null,
      warehouse: null,
      keyword: "",
      page: 1,
      pageSize: 10,
    });
  };

  // 데이터 새로고침 핸들러
  const handleRefresh = () => {
    refetchList();
  };

  // 행 선택 변경 핸들러
  const handleSelectionChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // 행 클릭 핸들러
  const handleRowClick = (record) => {
    setSelectedOrder(record);
    setDetailVisible(true);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page, pageSize) => {
    setFilters({
      ...filters,
      page,
      pageSize,
    });
  };

  // 신규 주문 등록 핸들러
  const handleNewOrder = () => {
    setNewOrderVisible(true);
  };

  // 신규 주문 제출 핸들러
  const handleNewOrderSubmit = (values) => {
    createOrderMutation.mutate(values);
  };

  // 주문 수정 핸들러
  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditOrderVisible(true);
  };

  // 주문 수정 제출 핸들러
  const handleEditOrderSubmit = (values) => {
    updateOrderMutation.mutate(values);
  };

  // 주문 삭제 핸들러
  const handleDeleteOrder = (id) => {
    if (!isAdmin()) {
      message.error("관리자만 주문을 삭제할 수 있습니다.");
      return;
    }

    deleteOrderMutation.mutate(id);
  };

  // 상태 변경 핸들러 - 단일 행에서만 실행 가능
  const handleStatusChange = (order) => {
    // 선택된 단일 행이 아닌 경우 경고 표시
    if (!order) {
      message.warning("상태 변경할 항목을 선택해주세요");
      return;
    }
    
    if (Array.isArray(selectedRowKeys) && selectedRowKeys.length > 1) {
      message.warning("상태 변경은 한 번에 하나의 주문만 가능합니다");
      return;
    }
    
    setSelectedOrder(order);
    setStatusChangeVisible(true);
  };

  // 상태 변경 제출 핸들러 - 세션에서 가져온 사용자 정보 활용
  const handleStatusChangeSubmit = (values) => {
    // 세션 기반으로 서버에서 인증하므로 API 호출 시 사용자 정보는 서버에서 세션에서 가져옴
    updateStatusMutation.mutate({
      id: selectedOrder.dashboard_id,
      status: values.status,
    });
  };

  // 배차 처리 핸들러
  const handleAssignDriver = (order) => {
    setSelectedOrder(order);
    setIsMultipleAssign(false);
    setAssignDriverVisible(true);
  };

  // 다중 배차 처리 핸들러
  const handleMultiAssignDriver = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("선택된 주문이 없습니다.");
      return;
    }

    setIsMultipleAssign(true);
    setAssignDriverVisible(true);
  };

  // 배차 처리 제출 핸들러 - 세션에서 가져온 사용자 정보 활용
  const handleAssignDriverSubmit = (values) => {
    // 세션 기반으로 서버에서 인증하므로 API 호출 시 사용자 정보는 서버에서 세션에서 가져옴
    if (isMultipleAssign) {
      // 다중 배차 처리
      assignMultiDriversMutation.mutate({
        ids: selectedRowKeys,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });
    } else {
      // 단일 배차 처리
      assignDriverMutation.mutate({
        id: selectedOrder.dashboard_id,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });
    }
  };

  // 오류 처리
  useEffect(() => {
    if (listError) {
      notification.error({
        message: "데이터 로드 실패",
        description:
          listError.message || "주문 목록을 불러오는 중 오류가 발생했습니다.",
      });
    }
  }, [listError]);

  // 상태별 주문 수 집계
  const countByStatus = () => {
    if (!dashboardData || !dashboardData.data || !dashboardData.data.items) {
      return {
        total: 0,
        waiting: 0,
        inProgress: 0,
        complete: 0,
        issue: 0,
        cancel: 0,
      };
    }

    const items = dashboardData.data.items;
    let waiting = 0,
      inProgress = 0,
      complete = 0,
      issue = 0,
      cancel = 0;

    items.forEach((item) => {
      switch (item.status) {
        case "WAITING":
          waiting++;
          break;
        case "IN_PROGRESS":
          inProgress++;
          break;
        case "COMPLETE":
          complete++;
          break;
        case "ISSUE":
          issue++;
          break;
        case "CANCEL":
          cancel++;
          break;
        default:
          break;
      }
    });

    return {
      total: items.length,
      waiting,
      inProgress,
      complete,
      issue,
      cancel,
    };
  };

  // 페이지네이션 설정
  const paginationConfig = {
    current: filters.page,
    pageSize: filters.pageSize,
    total: dashboardData?.data?.total || 0,
    onChange: handlePageChange,
    showSizeChanger: true,
    showTotal: (total) => `총 ${total}건`,
  };

  // 필터링된 데이터
  const filteredData = dashboardData?.data?.items || [];

  // 상태별 통계
  const statusStats = countByStatus();

  // 관리자 여부 확인
  const admin = isAdmin();

  return (
    <div className="dashboard-page">
      <Card
        title="배송 관리 대시보드"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewOrder}
            >
              신규 등록
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoadingList}
            >
              새로고침
            </Button>
          </Space>
        }
      >
        {/* 필터 패널 */}
        <FilterPanel
          onFilter={handleFilterApply}
          onReset={handleFilterReset}
          onRefresh={handleRefresh}
          defaultValues={filters}
        />

        {/* 요약 카드 */}
        <SummaryCards stats={statusStats} loading={isLoadingList} />

        {/* 액션 버튼 */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <Button
              type="primary"
              icon={<CarOutlined />}
              onClick={handleMultiAssignDriver}
              disabled={selectedRowKeys.length === 0}
              ghost
            >
              선택 배차
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => {
                if (selectedRowKeys.length !== 1) {
                  message.warning("상태 변경은 한 번에 하나의 주문만 가능합니다");
                  return;
                }
                // 해당 행 데이터를 찾아서 상태 변경 모달로 전달
                const selectedOrder = filteredData.find(
                  item => item.dashboard_id === selectedRowKeys[0]
                );
                if (selectedOrder) {
                  handleStatusChange(selectedOrder);
                }
              }}
              disabled={selectedRowKeys.length !== 1}
              ghost
            >
              상태 변경
            </Button>
          </Space>

          {admin && (
            <Popconfirm
              title="선택한 주문을 삭제하시겠습니까?"
              description="삭제된 주문은 복구할 수 없습니다."
              onConfirm={() => handleDeleteOrder(selectedRowKeys[0])}
              okText="삭제"
              cancelText="취소"
              disabled={selectedRowKeys.length !== 1}
            >
              <Button
                type="primary"
                icon={<DeleteOutlined />}
                danger
                disabled={selectedRowKeys.length !== 1}
              >
                삭제
              </Button>
            </Popconfirm>
          )}
        </div>

        {/* 주문 목록 테이블 */}
        <OrdersTable
          data={filteredData}
          loading={isLoadingList}
          onRowClick={handleRowClick}
          onSelectionChange={handleSelectionChange}
          pagination={paginationConfig}
        />
      </Card>

      {/* 주문 상세 모달 */}
      <OrderDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        data={orderDetail?.data}
        onEdit={handleEditOrder}
        onAssign={handleAssignDriver}
        onStatusChange={handleStatusChange}
        loading={isLoadingDetail}
      />

      {/* 신규 주문 등록 모달 */}
      <NewOrderModal
        visible={newOrderVisible}
        onClose={() => setNewOrderVisible(false)}
        onSubmit={handleNewOrderSubmit}
        loading={createOrderMutation.isLoading}
      />

      {/* 주문 수정 모달 */}
      <EditOrderModal
        visible={editOrderVisible}
        onClose={() => setEditOrderVisible(false)}
        onSubmit={handleEditOrderSubmit}
        orderData={orderDetail?.data}
        loading={updateOrderMutation.isLoading}
      />

      {/* 상태 변경 모달 */}
      <StatusChangeModal
        visible={statusChangeVisible}
        onClose={() => setStatusChangeVisible(false)}
        onSubmit={handleStatusChangeSubmit}
        orderData={selectedOrder}
        loading={updateStatusMutation.isLoading}
      />

      {/* 배차 처리 모달 */}
      <AssignDriverModal
        visible={assignDriverVisible}
        onClose={() => setAssignDriverVisible(false)}
        onSubmit={handleAssignDriverSubmit}
        orderData={isMultipleAssign ? selectedRowKeys : selectedOrder}
        isMultiple={isMultipleAssign}
        loading={
          assignDriverMutation.isLoading || assignMultiDriversMutation.isLoading
        }
      />
    </div>
  );
};

export default DashboardPage;