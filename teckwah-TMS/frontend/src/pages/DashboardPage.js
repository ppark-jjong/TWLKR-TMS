/**
 * 대시보드 페이지 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import {
  Button,
  Space,
  Table,
  Tooltip,
  message,
  Popconfirm,
  Modal,
  Row,
  Col,
  DatePicker,
  Input,
  Select,
  Card,
  Statistic,
  Divider,
  Form,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UserSwitchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import MainLayout from '../components/layout/MainLayout';
import { ErrorResult } from '../components/common';
import { DashboardService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import 'dayjs/plugin/timezone';
import 'dayjs/plugin/utc';
import {
  STATUS_OPTIONS,
  DEPARTMENT_OPTIONS,
  WAREHOUSE_OPTIONS,
  TYPE_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from '../constants';
import { useDataFetching } from '../hooks';

const { confirm } = Modal;
const { RangePicker } = DatePicker;
const { Option } = Select;

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    WAITING: 0,
    IN_PROGRESS: 0,
    COMPLETE: 0,
    ISSUE: 0,
    CANCEL: 0,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [filters, setFilters] = useState({
    startDate: dayjs().tz('Asia/Seoul').startOf('day').toISOString(),
    endDate: dayjs().tz('Asia/Seoul').endOf('day').toISOString(),
    status: '',
    department: '',
    warehouse: '',
    orderNo: '',
  });

  // 모달 상태
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderData, setSelectedOrderData] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false); // 편집 모드 상태 추가

  // 선택된 행 상태
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: pagination.current,
        limit: pagination.pageSize,
        orderNo: filters.orderNo,
      };

      const response = await DashboardService.getOrders(params);

      if (response.success) {
        // 클라이언트 측 필터링 적용
        let filteredData = response.data.items || [];

        if (filters.status) {
          filteredData = filteredData.filter(
            (item) => item.status === filters.status
          );
        }

        if (filters.department) {
          filteredData = filteredData.filter(
            (item) => item.department === filters.department
          );
        }

        if (filters.warehouse) {
          filteredData = filteredData.filter(
            (item) => item.warehouse === filters.warehouse
          );
        }

        setData(filteredData);
        setStatusCounts(
          response.data.statusCounts || {
            WAITING: 0,
            IN_PROGRESS: 0,
            COMPLETE: 0,
            ISSUE: 0,
            CANCEL: 0,
          }
        );

        setPagination({
          ...pagination,
          total: response.data.total || 0,
        });
      } else {
        setError(response.message || '데이터 조회 실패');
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, [
    filters.startDate,
    filters.endDate,
    filters.orderNo,
    pagination.current,
    pagination.pageSize,
  ]);

  // 날짜 필터 변경 처리
  const handleDateChange = (dates) => {
    if (!dates || dates.length !== 2) return;

    setFilters({
      ...filters,
      startDate: dates[0].startOf('day').toISOString(),
      endDate: dates[1].endOf('day').toISOString(),
    });

    // 1페이지로 이동
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  // 오늘 날짜로 설정
  const handleSetToday = () => {
    const today = dayjs().tz('Asia/Seoul');
    setFilters({
      ...filters,
      startDate: today.startOf('day').toISOString(),
      endDate: today.endOf('day').toISOString(),
    });

    // 1페이지로 이동
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  // 검색 처리
  const handleSearch = () => {
    // 1페이지로 이동
    setPagination({
      ...pagination,
      current: 1,
    });

    // 데이터 다시 불러오기
    fetchData();
  };

  // 필터 적용
  const handleApplyFilter = () => {
    // 클라이언트 측 필터링만 수행
    fetchData();
  };

  // 필터 초기화
  const handleResetFilter = () => {
    setFilters({
      ...filters,
      status: '',
      department: '',
      warehouse: '',
    });
  };

  // 데이터 새로고침
  const handleRefresh = () => {
    fetchData();
  };

  // 테이블 변경 처리 (페이지네이션)
  const handleTableChange = (pagination) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    });
  };

  // 주문 상세 모달 열기 (조회 시 락 획득 안함)
  const handleOpenDetailModal = async (orderId) => {
    try {
      // 선택한 주문 설정 및 모달 표시 (조회는 락 없이)
      setSelectedOrder(orderId);
      setIsDetailModalVisible(true);

      // 상세 정보 로드
      const response = await DashboardService.getOrder(orderId);
      if (response.success) {
        // 락 상태 확인만 표시
        if (response.lock_status && !response.lock_status.editable) {
          message.info(
            `현재 ${
              response.lock_status.locked_by || '다른 사용자'
            }가 편집 중입니다.`
          );
        }
        setSelectedOrderData(response.data);
      }
    } catch (error) {
      console.error('주문 조회 오류:', error);
      message.error('주문 정보 로드 중 오류가 발생했습니다');
    }
  };

  // 수정 버튼 클릭 시 락 획득
  const handleEditOrderClick = async (orderId) => {
    try {
      // 락 획득 시도 - update_by와 update_at 필드는 백엔드에서 자동으로 설정됨
      const lockResponse = await DashboardService.lockOrder(orderId);

      if (!lockResponse.success || !lockResponse.lock_status?.editable) {
        // 락 획득 실패 시 오류 메시지
        message.error(
          lockResponse.message ||
            '현재 다른 사용자가 편집 중이라 수정할 수 없습니다.'
        );
        return false;
      }

      // 락 획득 성공 시 수정 모드로 변경
      setEditMode(true);
      return true;
    } catch (error) {
      console.error('락 획득 오류:', error);
      message.error('수정 권한 획득 중 오류가 발생했습니다');
      return false;
    }
  };

  // 주문 생성 모달 열기
  const handleOpenCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  // 기사 배정 모달 열기 (선택된 주문들에 대한 락 획득)
  const handleOpenDriverModal = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('기사를 배정할 주문을 선택해주세요');
      return;
    }

    // 락 획득은 실제 배치 작업 시에만 수행 (모달에서 확인 버튼 클릭 시)
    setIsDriverModalVisible(true);
  };

  // 상태 변경 모달 열기 (선택된 주문들에 대한 락 획득)
  const handleOpenStatusModal = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('상태를 변경할 주문을 선택해주세요');
      return;
    }

    // 락 획득은 실제 상태 변경 시에만 수행 (모달에서 확인 버튼 클릭 시)
    setIsStatusModalVisible(true);
  };

  // 배차 처리 확인 (실제 락 획득 및 배차 처리)
  const handleAssignDriver = async (driverData) => {
    // 선택된 모든 주문에 대해 락 획득 시도
    const lockedIds = [];
    let failCount = 0;

    for (const orderId of selectedRowKeys) {
      try {
        const lockResponse = await DashboardService.lockOrder(orderId);
        if (lockResponse.success && lockResponse.lock_status?.editable) {
          lockedIds.push(orderId);
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`주문 ID ${orderId} 락 획득 오류:`, error);
        failCount++;
      }
    }

    if (failCount > 0) {
      message.warning(
        `${failCount}개 주문에 대한 락 획득 실패로 해당 주문은 처리되지 않습니다.`
      );
    }

    if (lockedIds.length > 0) {
      try {
        // 실제 배차 처리 요청 - 백엔드 API 메서드명과 일치시킴
        const response = await DashboardService.assignDriverToOrders(
          lockedIds,
          driverData.driverName,
          driverData.driverContact
        );

        if (response.success) {
          message.success(
            `${lockedIds.length}개 주문에 배차 처리가 완료되었습니다.`
          );
          fetchData();
        } else {
          message.error(response.message || '배차 처리 실패');
        }
      } catch (error) {
        console.error('배차 처리 오류:', error);
        message.error('배차 처리 중 오류가 발생했습니다');
      } finally {
        // 락 해제
        for (const orderId of lockedIds) {
          try {
            await DashboardService.unlockOrder(orderId);
          } catch (error) {
            console.error(`주문 ID ${orderId} 락 해제 오류:`, error);
          }
        }
      }
    }

    setIsDriverModalVisible(false);
  };

  // 상태 변경 확인 (실제 락 획득 및 상태 변경)
  const handleChangeStatus = async (statusData) => {
    // 선택된 모든 주문에 대해 락 획득 시도
    const lockedIds = [];
    let failCount = 0;

    for (const orderId of selectedRowKeys) {
      try {
        const lockResponse = await DashboardService.lockOrder(orderId);
        if (lockResponse.success && lockResponse.lock_status?.editable) {
          lockedIds.push(orderId);
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`주문 ID ${orderId} 락 획득 오류:`, error);
        failCount++;
      }
    }

    if (failCount > 0) {
      message.warning(
        `${failCount}개 주문에 대한 락 획득 실패로 해당 주문은 처리되지 않습니다.`
      );
    }

    if (lockedIds.length > 0) {
      try {
        // 백엔드 API 메서드명과 일치시킴
        const response = await DashboardService.updateOrdersStatus(
          lockedIds,
          statusData.status
        );

        if (response.success) {
          message.success(
            `${lockedIds.length}개 주문의 상태가 '${statusData.status}'로 변경되었습니다.`
          );
          fetchData();
        } else {
          message.error(response.message || '상태 변경 실패');
        }
      } catch (error) {
        console.error('상태 변경 오류:', error);
        message.error('상태 변경 중 오류가 발생했습니다');
      } finally {
        // 락 해제
        for (const orderId of lockedIds) {
          try {
            await DashboardService.unlockOrder(orderId);
          } catch (error) {
            console.error(`주문 ID ${orderId} 락 해제 오류:`, error);
          }
        }
      }
    }

    setIsStatusModalVisible(false);
  };

  // 단일 주문 삭제
  const handleDeleteOrder = async (orderId) => {
    try {
      const response = await DashboardService.deleteOrder(orderId);

      if (response.success) {
        message.success('주문이 삭제되었습니다');
        fetchData();
      } else {
        message.error(response.message || '주문 삭제 실패');
      }
    } catch (error) {
      console.error('주문 삭제 오류:', error);
      message.error('주문 삭제 중 오류가 발생했습니다');
    }
  };

  // 다중 주문 삭제
  const handleDeleteMultiple = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 주문을 선택해주세요');
      return;
    }

    confirm({
      title: '선택한 주문을 삭제하시겠습니까?',
      icon: <ExclamationCircleOutlined />,
      content: `${selectedRowKeys.length}개의 주문이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          const response = await DashboardService.deleteOrders(
            selectedRowKeys
          );

          if (response.success) {
            message.success(response.message || '선택한 주문이 삭제되었습니다');
            setSelectedRowKeys([]);
            fetchData();
          } else {
            message.error(response.message || '주문 삭제 실패');
          }
        } catch (error) {
          console.error('다중 주문 삭제 오류:', error);
          message.error('주문 삭제 중 오류가 발생했습니다');
        }
      },
    });
  };

  // 데이터 다운로드
  const handleDownload = async () => {
    try {
      await DashboardService.downloadOrders(filters);
      message.success('데이터 다운로드가 완료되었습니다');
    } catch (error) {
      console.error('다운로드 오류:', error);
      message.error('데이터 다운로드 중 오류가 발생했습니다');
    }
  };

  // 상태에 따른 배지 렌더링
  const renderStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(
      (option) => option.value === status
    );
    if (!statusOption) return <span>-</span>;

    return (
      <div
        style={{
          backgroundColor: statusOption.color,
          color: statusOption.textColor,
          padding: '2px 8px',
          borderRadius: '12px',
          display: 'inline-block',
          fontSize: '0.8rem',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {statusOption.icon} {statusOption.label}
      </div>
    );
  };

  // 유형에 따른 배지 렌더링
  const renderTypeBadge = (type) => {
    const typeOption = TYPE_OPTIONS.find((option) => option.value === type);
    if (!typeOption) return <span>-</span>;

    return (
      <div
        style={{
          backgroundColor: typeOption.color,
          color: typeOption.textColor,
          padding: '2px 8px',
          borderRadius: '12px',
          display: 'inline-block',
          fontSize: '0.8rem',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {typeOption.label}
      </div>
    );
  };

  // 테이블 컬럼 설정
  const columns = [
    {
      title: '주문번호',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text) => (
        <div style={{ fontWeight: 500, color: '#1890ff', cursor: 'pointer' }}>
          {text}
        </div>
      ),
    },
    {
      title: '고객',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: renderTypeBadge,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusBadge,
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '창고',
      dataIndex: 'warehouse',
      key: 'warehouse',
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '배송기사',
      dataIndex: 'driverName',
      key: 'driverName',
      render: (text) => text || '-',
    },
  ];

  // 행 선택 설정
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  // 행 클릭 설정
  const handleRowClick = (record) => {
    return {
      onClick: () => {
        handleOpenDetailModal(record.dashboardId);
      },
    };
  };

  // 모달 닫기 (편집 모드인 경우에만 락 해제)
  const handleCloseDetailModal = async () => {
    if (selectedOrder && editMode) {
      try {
        await DashboardService.unlockOrder(selectedOrder);
      } catch (error) {
        console.error('락 해제 오류:', error);
      }
      setEditMode(false);
    }
    setIsDetailModalVisible(false);
  };

  // 수정 완료 시 락 해제
  const handleUpdateComplete = async () => {
    if (selectedOrder) {
      try {
        await DashboardService.unlockOrder(selectedOrder);
        message.success('수정이 완료되었습니다.');
        setEditMode(false);
        fetchData(); // 데이터 새로고침
      } catch (error) {
        console.error('락 해제 오류:', error);
        message.error('락 해제 중 오류가 발생했습니다');
      }
    }
  };

  // 에러 발생 시 재시도
  const handleRetry = () => {
    fetchData();
  };

  // 모달 성공 시 데이터 재조회
  const handleModalSuccess = () => {
    fetchData();
  };

  if (error) {
    return (
      <MainLayout>
        <ErrorResult
          status="error"
          title="데이터 로드 오류"
          subTitle={error}
          onRetry={handleRetry}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="main-card" style={{ position: 'relative' }}>
        {/* 상단 필터 영역 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RangePicker
                value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
                onChange={handleDateChange}
                allowClear={false}
              />
              <Button type="primary" onClick={handleSearch}>
                <SearchOutlined /> 조회
              </Button>
              <Button onClick={handleSetToday}>오늘</Button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '20px',
                }}
              >
                <span
                  style={{
                    marginRight: '8px',
                    fontSize: '13px',
                    color: '#666',
                  }}
                >
                  표시 행 수:
                </span>
                <Select
                  value={pagination.pageSize}
                  onChange={(value) =>
                    setPagination({
                      ...pagination,
                      pageSize: value,
                      current: 1,
                    })
                  }
                  style={{ width: '80px' }}
                >
                  <Option value={5}>5행</Option>
                  <Option value={10}>10행</Option>
                  <Option value={15}>15행</Option>
                  <Option value={20}>20행</Option>
                </Select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
              placeholder="주문번호 검색"
              value={filters.orderNo}
              onChange={(e) =>
                setFilters({ ...filters, orderNo: e.target.value })
              }
              style={{ width: '200px' }}
              onPressEnter={handleSearch}
            />
            <Button
              type="primary"
              onClick={handleSearch}
              style={{ marginLeft: '8px' }}
            >
              <SearchOutlined />
            </Button>
          </div>
        </div>

        {/* 필터와 액션 버튼을 같은 줄에 배치 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* 필터 영역 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f5f7fa',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e8e8e8',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'nowrap',
                alignItems: 'center',
              }}
            >
              <div style={{ width: '120px' }}>
                <label
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  상태
                </label>
                <Select
                  placeholder="상태"
                  value={filters.status}
                  onChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                  style={{ width: '100%' }}
                  allowClear
                >
                  {STATUS_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>

              <div style={{ width: '120px' }}>
                <label
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  부서
                </label>
                <Select
                  placeholder="부서"
                  value={filters.department}
                  onChange={(value) =>
                    setFilters({ ...filters, department: value })
                  }
                  style={{ width: '100%' }}
                  allowClear
                >
                  {DEPARTMENT_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>

              <div style={{ width: '120px' }}>
                <label
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  창고
                </label>
                <Select
                  placeholder="창고"
                  value={filters.warehouse}
                  onChange={(value) =>
                    setFilters({ ...filters, warehouse: value })
                  }
                  style={{ width: '100%' }}
                  allowClear
                >
                  {WAREHOUSE_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
              <Button
                type="primary"
                onClick={handleApplyFilter}
                style={{ height: '36px' }}
              >
                <SearchOutlined /> 필터 적용
              </Button>
              <Button onClick={handleResetFilter} style={{ height: '36px' }}>
                초기화
              </Button>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <Button type="primary" onClick={handleRefresh}>
              <ReloadOutlined /> 새로고침
            </Button>
            <Button
              type="primary"
              onClick={handleOpenStatusModal}
              disabled={selectedRowKeys.length === 0}
            >
              <SwapOutlined /> 상태 변경
            </Button>
            <Button
              type="primary"
              onClick={handleOpenDriverModal}
              disabled={selectedRowKeys.length === 0}
            >
              <UserOutlined /> 배차 처리
            </Button>
            <Button type="primary" onClick={handleOpenCreateModal}>
              <PlusOutlined /> 신규 등록
            </Button>
            {currentUser.user_role === 'ADMIN' && (
              <Button
                danger
                onClick={handleDeleteMultiple}
                disabled={selectedRowKeys.length === 0}
              >
                <DeleteOutlined /> 삭제
              </Button>
            )}
          </div>
        </div>

        {/* 요약 카드 영역 */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <Card style={{ flex: 1, minWidth: '200px' }}>
            <Statistic
              title="총 건수"
              value={data.length}
              suffix="건"
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>

          <Card style={{ flex: 1, minWidth: '200px' }}>
            <Statistic
              title="대기"
              value={statusCounts.WAITING || 0}
              suffix="건"
              valueStyle={{ color: '#ad8b00' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>

          <Card style={{ flex: 1, minWidth: '200px' }}>
            <Statistic
              title="진행"
              value={statusCounts.IN_PROGRESS || 0}
              suffix="건"
              valueStyle={{ color: '#1890ff' }}
              prefix={<SwapOutlined />}
            />
          </Card>

          <Card style={{ flex: 1, minWidth: '200px' }}>
            <Statistic
              title="완료"
              value={statusCounts.COMPLETE || 0}
              suffix="건"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>

          <Card style={{ flex: 1, minWidth: '200px' }}>
            <Statistic
              title="이슈+취소"
              value={(statusCounts.ISSUE || 0) + (statusCounts.CANCEL || 0)}
              suffix="건"
              valueStyle={{ color: '#eb2f96' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </div>

        {/* 테이블 */}
        <Table
          dataSource={data}
          columns={columns}
          rowKey="dashboardId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `전체 ${total}개`,
            position: ['bottomCenter'],
          }}
          onChange={handleTableChange}
          rowSelection={rowSelection}
          onRow={handleRowClick}
          scroll={{ x: 'max-content' }}
          bordered
          style={{
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        />

        {/* 선택된 행 수 표시 */}
        {selectedRowKeys.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              background: '#f5f7fa',
              borderRadius: '8px',
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              <strong>{selectedRowKeys.length}개</strong> 주문 선택됨
            </span>
            <Space>
              <Button type="primary" onClick={handleOpenStatusModal}>
                <SwapOutlined /> 상태 변경
              </Button>
              <Button type="primary" onClick={handleOpenDriverModal}>
                <UserOutlined /> 배차 처리
              </Button>
              {currentUser.user_role === 'ADMIN' && (
                <Button danger onClick={handleDeleteMultiple}>
                  <DeleteOutlined /> 삭제
                </Button>
              )}
            </Space>
          </div>
        )}
      </div>

      {/* 여기에 필요한 모달들 추가 */}
      {/* 주문 상세 모달 */}
      <Modal
        title="주문 상세 정보"
        open={isDetailModalVisible}
        onCancel={handleCloseDetailModal}
        width={800}
        footer={[
          <Button key="close" onClick={handleCloseDetailModal}>
            닫기
          </Button>,
          !editMode && (
            <Button
              key="edit"
              type="primary"
              onClick={() => handleEditOrderClick(selectedOrder)}
            >
              수정하기
            </Button>
          ),
          editMode && (
            <Button key="save" type="primary" onClick={handleUpdateComplete}>
              저장하기
            </Button>
          ),
        ]}
      >
        {selectedOrder && selectedOrderData && (
          <div>
            <p>주문 ID: {selectedOrder}</p>
            {editMode ? (
              <div>
                <p>편집 모드 - 수정 양식이 여기에 표시됩니다</p>
                {/* 수정 양식 컴포넌트 */}
              </div>
            ) : (
              <div>
                <p>읽기 모드 - 상세 정보가 여기에 표시됩니다</p>
                {/* 상세 정보 표시 컴포넌트 */}
              </div>
            )}
            {selectedOrderData.lock_status &&
              !selectedOrderData.lock_status.editable && (
                <div style={{ color: 'red', marginTop: '10px' }}>
                  현재{' '}
                  {selectedOrderData.lock_status.locked_by || '다른 사용자'}가
                  편집 중입니다.
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* 주문 생성 모달 */}
      <Modal
        title="신규 배송 등록"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCreateModalVisible(false)}>
            취소
          </Button>,
          <Button key="submit" type="primary">
            등록하기
          </Button>,
        ]}
      >
        <p>신규 주문 생성 폼</p>
      </Modal>

      {/* 기사 배정 모달 */}
      <Modal
        title="배차 처리"
        open={isDriverModalVisible}
        onCancel={() => setIsDriverModalVisible(false)}
        footer={null} // 폼 내부에서 버튼 처리
      >
        <Form onFinish={handleAssignDriver} layout="vertical">
          <Form.Item
            name="driverName"
            label="기사 이름"
            rules={[{ required: true, message: '기사 이름을 입력하세요' }]}
          >
            <Input placeholder="기사 이름을 입력하세요" />
          </Form.Item>

          <Form.Item name="driverContact" label="기사 번호">
            <Input placeholder="기사 연락처를 입력하세요" />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '16px',
            }}
          >
            <Button onClick={() => setIsDriverModalVisible(false)}>취소</Button>
            <Button type="primary" htmlType="submit">
              배차 확인 ({selectedRowKeys.length}건)
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 상태 변경 모달 */}
      <Modal
        title="상태 변경"
        open={isStatusModalVisible}
        onCancel={() => setIsStatusModalVisible(false)}
        footer={null} // 폼 내부에서 버튼 처리
      >
        <Form onFinish={handleChangeStatus} layout="vertical">
          <Form.Item
            name="status"
            label="변경할 상태"
            rules={[{ required: true, message: '상태를 선택하세요' }]}
          >
            <Select placeholder="상태 선택" style={{ width: '100%' }}>
              {STATUS_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '16px',
            }}
          >
            <Button onClick={() => setIsStatusModalVisible(false)}>취소</Button>
            <Button type="primary" htmlType="submit">
              확인 ({selectedRowKeys.length}건)
            </Button>
          </div>
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default DashboardPage;