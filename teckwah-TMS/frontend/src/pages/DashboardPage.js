/**
 * 대시보드 페이지 컴포넌트
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  Popover,
  Checkbox,
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
  SettingOutlined,
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
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
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
    startDate: dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
    endDate: dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
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
  const [editMode, setEditMode] = useState(false);

  // 선택된 행 상태
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // --- 컬럼 커스터마이징 상태 ---
  const initialVisibleColumns = [
    'orderNo',
    'type',
    'status',
    'department',
    'customer',
    'address',
    'eta',
    'createTime',
    'driverName',
    'action',
  ];
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns);
  // -----------------------------

  // 데이터 불러오기 (CSR 필터링 위해 수정)
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
        setRawData(response.data.items || []);
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
        setRawData([]);
        setFilteredData([]);
        setPagination({ ...pagination, total: 0 });
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다');
      setRawData([]);
      setFilteredData([]);
      setPagination({ ...pagination, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드 및 페이지네이션/검색 조건 변경 시 데이터 재조회
  useEffect(() => {
    fetchData();
  }, [
    filters.startDate,
    filters.endDate,
    filters.orderNo,
    pagination.current,
    pagination.pageSize,
  ]);

  // --- CSR 필터링 로직 ---
  useEffect(() => {
    let processedData = [...rawData];

    if (filters.status) {
      processedData = processedData.filter(
        (item) => item.status === filters.status
      );
    }
    if (filters.department) {
      processedData = processedData.filter(
        (item) => item.department === filters.department
      );
    }
    if (filters.warehouse) {
      processedData = processedData.filter(
        (item) => item.warehouse === filters.warehouse
      );
    }

    setFilteredData(processedData);
  }, [rawData, filters.status, filters.department, filters.warehouse]);
  // -----------------------

  // 날짜 필터 변경 처리 (fetchData 호출 안 함, 상태만 변경)
  const handleDateChange = (dates) => {
    if (!dates || dates.length !== 2) return;
    setFilters({
      ...filters,
      startDate: dates[0].startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      endDate: dates[1].endOf('day').format('YYYY-MM-DD HH:mm:ss'),
    });
    setPagination({ ...pagination, current: 1 });
  };

  // 오늘 날짜로 설정 (fetchData 호출 안 함, 상태만 변경)
  const handleSetToday = () => {
    const today = dayjs();
    setFilters({
      ...filters,
      startDate: today.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      endDate: today.endOf('day').format('YYYY-MM-DD HH:mm:ss'),
    });
    setPagination({ ...pagination, current: 1 });
  };

  // 검색 처리 (fetchData 호출 유지 - 백엔드 검색 필요)
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    fetchData();
  };

  // 필터 적용 버튼 핸들러 (이제 아무 작업 안 함, useEffect가 처리)
  const handleApplyFilter = () => {
    console.log('Applying filters (CSR):', filters);
  };

  // 필터 초기화 (fetchData 호출 안 함, 상태만 변경)
  const handleResetFilter = () => {
    setFilters({
      ...filters,
      status: '',
      department: '',
      warehouse: '',
    });
  };

  // 데이터 새로고침 (fetchData 호출 유지)
  const handleRefresh = () => {
    fetchData();
  };

  // 테이블 변경 처리 (페이지네이션만 fetchData 트리거)
  const handleTableChange = (pagination /* filters, sorter */) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    });
  };

  // 주문 상세 모달 열기 (조회 시 락 획득 안함)
  const handleOpenDetailModal = async (orderId) => {
    setSelectedOrder(orderId);
    setIsDetailModalVisible(true);
    setLoading(true);
    try {
      const response = await DashboardService.getOrder(orderId);
      if (response.success) {
        setSelectedOrderData(response.data);
        setEditMode(response.data.lockedInfo?.editable || false);
      } else {
        message.error(response.message || '주문 정보 조회 실패');
        setIsDetailModalVisible(false);
      }
    } catch (error) {
      message.error('주문 정보를 불러오는 중 오류 발생');
      setIsDetailModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // 편집 모드로 주문 상세 모달 열기 (조회 시 락 획득 안함)
  const handleEditOrderClick = async (orderId) => {
    setSelectedOrder(orderId);
    setIsDetailModalVisible(true);
    setLoading(true);
    try {
      // 락 획득 시도
      const lockResponse = await DashboardService.lockOrder(orderId);
      if (lockResponse.success) {
        const orderResponse = await DashboardService.getOrder(orderId);
        if (orderResponse.success) {
          setSelectedOrderData(orderResponse.data);
          setEditMode(true); // 편집 모드 활성화
        } else {
          message.error(orderResponse.message || '주문 정보 조회 실패');
          setIsDetailModalVisible(false);
        }
      } else {
        message.warning(lockResponse.message || '주문 잠금 실패');
        // 잠금 실패 시, 읽기 모드로 열기
        const orderResponse = await DashboardService.getOrder(orderId);
        if (orderResponse.success) {
          setSelectedOrderData(orderResponse.data);
          setEditMode(false); // 읽기 모드로 설정
        } else {
          message.error(orderResponse.message || '주문 정보 조회 실패');
          setIsDetailModalVisible(false);
        }
      }
    } catch (error) {
      message.error('주문 정보를 불러오거나 잠그는 중 오류 발생');
      setIsDetailModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // 주문 생성 모달 열기
  const handleOpenCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  // 기사 배정 모달 열기
  const handleOpenDriverModal = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('기사를 배정할 주문을 선택해주세요');
      return;
    }
    setIsDriverModalVisible(true);
  };

  // 상태 변경 모달 열기
  const handleOpenStatusModal = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('상태를 변경할 주문을 선택해주세요');
      return;
    }
    setIsStatusModalVisible(true);
  };

  // 기사 배정 처리
  const handleAssignDriver = async (driverData) => {
    setLoading(true);
    try {
      const orderIds = selectedRowKeys;
      const response = await DashboardService.assignDriverToOrders(
        orderIds,
        driverData.driverName,
        driverData.driverContact
      );
      if (response.success) {
        message.success('기사 배정 성공');
        setIsDriverModalVisible(false);
        setSelectedRowKeys([]);
        fetchData();
      } else {
        message.error(response.message || '기사 배정 실패');
      }
    } catch (error) {
      message.error('기사 배정 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 상태 변경 처리
  const handleChangeStatus = async (statusData) => {
    setLoading(true);
    try {
      const orderIds = selectedRowKeys;
      const response = await DashboardService.updateOrdersStatus(
        orderIds,
        statusData.status
      );
      if (response.success) {
        message.success('상태 변경 성공');
        setIsStatusModalVisible(false);
        setSelectedRowKeys([]);
        fetchData();
      } else {
        message.error(response.message || '상태 변경 실패');
      }
    } catch (error) {
      message.error('상태 변경 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 주문 삭제 처리 (개별) - 삭제됨

  // 주문 다중 삭제 처리 (렌더링 조건 확인)
  const handleDeleteMultiple = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 주문을 선택해주세요.');
      return;
    }

    confirm({
      title: `${selectedRowKeys.length}개 주문을 삭제하시겠습니까?`,
      icon: <ExclamationCircleOutlined />,
      content: '삭제된 주문은 복구할 수 없습니다.',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await DashboardService.deleteOrders(selectedRowKeys);
          if (response.success) {
            message.success(response.message || '선택한 주문 삭제 성공');
            setSelectedRowKeys([]);
            fetchData();
          } else {
            message.error(response.message || '주문 삭제 실패');
          }
        } catch (error) {
          message.error('주문 삭제 중 오류 발생');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 데이터 다운로드 (현재 UI 없음)
  const handleDownload = async () => {
    /* ... */
  };

  // 상태에 따른 배지 렌더링
  const renderStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    return option ? (
      <span
        style={{
          backgroundColor: option.color,
          color: option.textColor,
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          border: `1px solid ${option.textColor || '#d9d9d9'}`,
        }}
      >
        {option.icon &&
          React.cloneElement(option.icon, { style: { marginRight: 4 } })}
        {option.label}
      </span>
    ) : (
      status
    );
  };

  // 유형에 따른 배지 렌더링
  const renderTypeBadge = (type) => {
    const option = TYPE_OPTIONS.find((opt) => opt.value === type);
    return option ? (
      <span
        style={{
          backgroundColor: option.color,
          color: option.textColor,
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        {option.label}
      </span>
    ) : (
      type
    );
  };

  // --- 테이블 컬럼 정의 (개별 삭제 제거) ---
  const baseColumns = useMemo(
    () => [
      {
        title: '주문번호',
        dataIndex: 'orderNo',
        key: 'orderNo',
        sorter: (a, b) => a.orderNo.localeCompare(b.orderNo),
        render: (text) => <Tooltip title={text}>{text}</Tooltip>,
        width: 150,
        ellipsis: true,
      },
      {
        title: '유형',
        dataIndex: 'type',
        key: 'type',
        render: renderTypeBadge,
        width: 80,
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        render: renderStatusBadge,
        width: 100,
      },
      {
        title: '부서',
        dataIndex: 'department',
        key: 'department',
        width: 100,
      },
      {
        title: '고객명',
        dataIndex: 'customer',
        key: 'customer',
        sorter: (a, b) => a.customer.localeCompare(b.customer),
        width: 120,
        ellipsis: true,
      },
      {
        title: '주소',
        dataIndex: 'address',
        key: 'address',
        ellipsis: true,
      },
      {
        title: 'ETA',
        dataIndex: 'eta',
        key: 'eta',
        render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
        sorter: (a, b) => dayjs(a.eta).unix() - dayjs(b.eta).unix(),
        width: 150,
      },
      {
        title: '접수시간',
        dataIndex: 'createTime',
        key: 'createTime',
        render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
        sorter: (a, b) =>
          dayjs(a.createTime).unix() - dayjs(b.createTime).unix(),
        width: 150,
      },
      {
        title: '기사명',
        dataIndex: 'driverName',
        key: 'driverName',
        render: (text) => text || '-',
        width: 100,
      },
      {
        title: '동작',
        key: 'action',
        fixed: 'right',
        width: 100,
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="상세 보기">
              <Button
                type="link"
                icon={<SearchOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetailModal(record.dashboardId);
                }}
              />
            </Tooltip>
            <Tooltip title="편집">
              <Button
                type="link"
                icon={<UserSwitchOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditOrderClick(record.dashboardId);
                }}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    []
  );
  // -----------------------------

  // --- 컬럼 커스터마이징 관련 ---
  const handleVisibleColumnsChange = (checkedValues) => {
    if (!checkedValues.includes('action')) {
      setVisibleColumns([...checkedValues, 'action']);
    } else {
      setVisibleColumns(checkedValues);
    }
  };

  const getVisibleTableColumns = () => {
    return baseColumns.filter((col) => visibleColumns.includes(col.key));
  };

  const columnSelectorContent = (
    <Checkbox.Group
      options={baseColumns
        .filter((col) => col.key !== 'action')
        .map((col) => ({ label: col.title, value: col.key }))}
      value={visibleColumns.filter((key) => key !== 'action')}
      onChange={handleVisibleColumnsChange}
      style={{ display: 'flex', flexDirection: 'column' }}
    />
  );
  // -----------------------------

  // 행 선택 설정
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  // 행 클릭 설정
  const handleRowClick = (record) => {
    handleOpenDetailModal(record.dashboardId);
  };

  // 모달 닫기
  const handleCloseDetailModal = async () => {
    if (selectedOrderData && editMode) {
      try {
        await DashboardService.unlockOrder(selectedOrderData.dashboardId);
      } catch (error) {
        console.error('락 해제 오류:', error);
      }
    }
    setIsDetailModalVisible(false);
    setSelectedOrder(null);
    setSelectedOrderData(null);
    setEditMode(false);
  };

  // 수정 완료 시
  const handleUpdateComplete = async () => {
    if (selectedOrderData) {
      try {
        await DashboardService.unlockOrder(selectedOrderData.dashboardId);
        message.success('수정이 완료되었습니다.');
        setEditMode(false);
        setIsDetailModalVisible(false);
        fetchData();
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
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <Option key={size} value={size}>
                      {size}행
                    </Option>
                  ))}
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
              style={{ width: 180 }}
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
              value={filteredData.length}
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

        {/* 테이블 상단 액션 영역 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <Popover
            content={columnSelectorContent}
            title="표시할 컬럼 선택"
            trigger="click"
            placement="bottomLeft"
          >
            <Button icon={<SettingOutlined />} />
          </Popover>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

        {/* 테이블 */}
        <Table
          columns={getVisibleTableColumns()}
          dataSource={filteredData}
          rowKey="dashboardId"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / 전체 ${pagination.total}개`,
            position: ['bottomCenter'],
          }}
          onChange={handleTableChange}
          rowSelection={rowSelection}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
          })}
          scroll={{ x: 1500 }}
          sticky
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
        title={editMode ? '주문 수정' : '주문 상세 정보'}
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
        {loading && <p>로딩 중...</p>}
        {!loading && selectedOrderData && (
          <div>
            <pre>{JSON.stringify(selectedOrderData, null, 2)}</pre>
            {selectedOrderData.lockedInfo &&
              !selectedOrderData.lockedInfo.editable && (
                <div style={{ color: 'red', marginTop: '10px' }}>
                  현재 {selectedOrderData.lockedInfo.lockedBy || '다른 사용자'}
                  가 편집 중입니다.
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
        footer={null}
      >
        <p>신규 주문 생성 폼 영역</p>
      </Modal>

      {/* 기사 배정 모달 */}
      <Modal
        title="배차 처리"
        open={isDriverModalVisible}
        onCancel={() => setIsDriverModalVisible(false)}
        footer={null}
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
        footer={null}
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
