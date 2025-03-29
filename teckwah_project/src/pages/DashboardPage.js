// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Table, Button, Space, Form, Input, Select, DatePicker,
  message, Tag, Row, Col, Divider, Popconfirm, Drawer, Card
} from 'antd';
import { SearchOutlined, EditOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';
import LoadingSpinner from '../components/LoadingSpinner';
import LockConflictModal from '../components/LockConflictModal';
import CommonModal from '../components/CommonModal';
import { 
  fetchDashboards, getDashboardDetail, updateStatus, assignDriver,
  acquireLock, releaseLock 
} from '../utils/api';
import { getUserFromToken } from '../utils/authHelpers';
import CreateDashboardModal from '../components/CreateDashboardModal';
const [createModalVisible, setCreateModalVisible] = useState(false);

const { Option } = Select;
const { RangePicker } = DatePicker;

// 스테이터스 태그 색상 매핑
const getStatusColor = (status) => {
  const colors = {
    'WAITING': 'blue',
    'IN_PROGRESS': 'orange',
    'COMPLETE': 'green',
    'ISSUE': 'red',
    'CANCEL': 'gray'
  };
  return colors[status] || 'default';
};

// 스테이터스 한글 변환 매핑
const getStatusText = (status) => {
  const texts = {
    'WAITING': '대기',
    'IN_PROGRESS': '진행',
    'COMPLETE': '완료',
    'ISSUE': '이슈',
    'CANCEL': '취소'
  };
  return texts[status] || status;
};

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [searchForm] = Form.useForm();
  const [detailForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState({
    page: 1,
    size: 10,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [statusForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [lockConflictInfo, setLockConflictInfo] = useState(null);
  const [lockType, setLockType] = useState('');
  const [dashboardIdForLock, setDashboardIdForLock] = useState(null);
  const [actionAfterLock, setActionAfterLock] = useState(null);

  // 대시보드 목록 조회
  const { data, isLoading, refetch } = useQuery(
    ['dashboards', searchParams],
    () => fetchDashboards(searchParams),
    {
      keepPreviousData: true,
      onError: (error) => {
        message.error('데이터 로딩 중 오류가 발생했습니다');
        console.error('Dashboard fetch error:', error);
      }
    }
  );

  // 상세 정보 조회
  const fetchDashboardDetail = async (id) => {
    try {
      const response = await getDashboardDetail(id);
      return response.data.data;
    } catch (error) {
      message.error('데이터 로딩 중 오류가 발생했습니다');
      console.error('Detail fetch error:', error);
      throw error;
    }
  };

  // 락 획득
  const handleAcquireLock = async (dashboardId, type, action) => {
    try {
      setDashboardIdForLock(dashboardId);
      setLockType(type);
      setActionAfterLock(action);
      
      const response = await acquireLock(dashboardId, type);
      
      if (response.data.success) {
        if (action) action();
      }
    } catch (error) {
      console.error('Lock acquisition error:', error);
      
      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
        return;
      }
      
      message.error('락 획득 중 오류가 발생했습니다');
    }
  };

  // 락 해제
  const handleReleaseLock = async (dashboardId, type) => {
    try {
      await releaseLock(dashboardId, type);
      // 락이 해제되었다는 알림은 굳이 표시하지 않음
    } catch (error) {
      console.error('Lock release error:', error);
      // 락 해제 실패는 조용히 처리 (이미 해제된 경우도 있으므로)
    }
  };

  // 락 재시도
  const handleRetryLock = async () => {
    setLockConflictInfo(null);
    
    if (dashboardIdForLock && lockType && actionAfterLock) {
      handleAcquireLock(dashboardIdForLock, lockType, actionAfterLock);
    }
  };

  // 락 취소
  const handleCancelLock = () => {
    setLockConflictInfo(null);
    setDashboardIdForLock(null);
    setLockType('');
    setActionAfterLock(null);
  };

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(
    ({ id, data }) => updateStatus(id, data),
    {
      onSuccess: () => {
        message.success('상태가 변경되었습니다');
        setStatusModalVisible(false);
        statusForm.resetFields();
        queryClient.invalidateQueries('dashboards');
        
        // 락 해제
        if (currentDashboard) {
          handleReleaseLock(currentDashboard.dashboard_id, 'STATUS');
        }
      },
      onError: (error) => {
        message.error('상태 변경 중 오류가 발생했습니다');
        console.error('Status update error:', error);
      }
    }
  );

  // 배차 처리 뮤테이션
  const assignMutation = useMutation(
    (data) => assignDriver(data),
    {
      onSuccess: () => {
        message.success('배차가 완료되었습니다');
        setAssignModalVisible(false);
        assignForm.resetFields();
        setSelectedRowKeys([]);
        queryClient.invalidateQueries('dashboards');
        
        // 락 해제 (다중 배차의 경우)
        selectedRowKeys.forEach(id => {
          handleReleaseLock(id, 'ASSIGN');
        });
      },
      onError: (error) => {
        message.error('배차 처리 중 오류가 발생했습니다');
        console.error('Assign error:', error);
      }
    }
  );

  // 검색 처리
  const handleSearch = (values) => {
    const params = { ...searchParams, page: 1 };
    
    if (values.search_term) params.search_term = values.search_term;
    if (values.status) params.status = values.status;
    if (values.department) params.department = values.department;
    if (values.warehouse) params.warehouse = values.warehouse;
    if (values.date_range) {
      params.start_date = values.date_range[0].format('YYYY-MM-DD');
      params.end_date = values.date_range[1].format('YYYY-MM-DD');
    }
    
    setSearchParams(params);
  };

  // 검색 초기화
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({
      page: 1,
      size: 10,
    });
  };

  // 상태 변경 모달 오픈
  const showStatusModal = (record) => {
    setCurrentDashboard(record);
    statusForm.setFieldsValue({
      status: record.status,
    });
    
    // 락 획득 후 모달 오픈
    handleAcquireLock(record.dashboard_id, 'STATUS', () => {
      setStatusModalVisible(true);
    });
  };

  // 배차 모달 오픈
  const showAssignModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }
    
    // 다중 락 획득 시도 - 모든 선택 항목에 대해 동시에
    Promise.all(selectedRowKeys.map(id => acquireLock(id, 'ASSIGN')))
      .then(() => {
        setAssignModalVisible(true);
      })
      .catch((error) => {
        console.error('Multiple lock acquisition error:', error);
        
        if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(error.response.data.data);
          return;
        }
        
        message.error('락 획득 중 오류가 발생했습니다');
      });
  };

  // 상태 변경 제출
  const handleStatusSubmit = () => {
    statusForm.validateFields().then(values => {
      if (!currentDashboard) return;
      
      statusMutation.mutate({
        id: currentDashboard.dashboard_id,
        data: {
          status: values.status,
          is_admin: false,
        }
      });
    });
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm.validateFields().then(values => {
      assignMutation.mutate({
        dashboard_ids: selectedRowKeys,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });
    });
  };

  // 상세 정보 모달 오픈
  const showDetailDrawer = async (id) => {
    try {
      const detail = await fetchDashboardDetail(id);
      setCurrentDashboard(detail);
      detailForm.setFieldsValue({
        ...detail,
        eta: detail.eta ? dayjs(detail.eta) : null,
        create_time: detail.create_time ? dayjs(detail.create_time) : null,
        depart_time: detail.depart_time ? dayjs(detail.depart_time) : null,
        complete_time: detail.complete_time ? dayjs(detail.complete_time) : null,
      });
      setDetailVisible(true);
    } catch (error) {
      message.error('상세 정보를 불러오는데 실패했습니다');
    }
  };

  // 페이지 변경
  const handleTableChange = (pagination) => {
    setSearchParams({
      ...searchParams,
      page: pagination.current,
      size: pagination.pageSize,
    });
  };

  // 선택 행 변경
  const onSelectChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '주문번호',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 120,
    },
    {
      title: '고객',
      dataIndex: 'customer',
      key: 'customer',
      width: 100,
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'DELIVERY' ? 'blue' : 'purple'}>
          {type === 'DELIVERY' ? '배송' : '회수'}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
      width: 80,
    },
    {
      title: '창고',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 80,
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      width: 150,
      render: (eta) => eta ? dayjs(eta).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '배송기사',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 120,
      render: (driver_name) => driver_name || '-',
    },
    {
      title: '액션',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => showStatusModal(record)}
            disabled={['COMPLETE', 'ISSUE', 'CANCEL'].includes(record.status)}
          >
            상태변경
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => showDetailDrawer(record.dashboard_id)}
          >
            상세
          </Button>
        </Space>
      ),
    },
  ];

  // 이전 검색 조건 복원
  useEffect(() => {
    const user = getUserFromToken();
    if (user) {
      searchForm.setFieldsValue({
        department: user.user_department,
      });
      
      handleSearch({ department: user.user_department });
    }
  }, []);

  return (
    <div>
      <Card title="대시보드" extra={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>새로고침</Button>}>  <Space>
    <Button type="primary" onClick={() => setCreateModalVisible(true)}>새 항목 생성</Button>
    <Button icon={<ReloadOutlined />} onClick={() => refetch()}>새로고침</Button>
  </Space>
        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
          initialValues={{
            date_range: [dayjs().subtract(7, 'day'), dayjs()],
          }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="search_term" label="검색어">
                <Input placeholder="주문번호, 고객명, 주소" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="status" label="상태">
                <Select placeholder="상태 선택" allowClear>
                  <Option value="WAITING">대기</Option>
                  <Option value="IN_PROGRESS">진행</Option>
                  <Option value="COMPLETE">완료</Option>
                  <Option value="ISSUE">이슈</Option>
                  <Option value="CANCEL">취소</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="department" label="부서">
                <Select placeholder="부서 선택" allowClear>
                  <Option value="CS">CS</Option>
                  <Option value="HES">HES</Option>
                  <Option value="LENOVO">LENOVO</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="warehouse" label="창고">
                <Select placeholder="창고 선택" allowClear>
                  <Option value="SEOUL">서울</Option>
                  <Option value="BUSAN">부산</Option>
                  <Option value="GWANGJU">광주</Option>
                  <Option value="DAEJEON">대전</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="date_range" label="날짜 범위">
                <RangePicker locale={locale} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Button onClick={handleReset} style={{ marginRight: 8 }}>
                초기화
              </Button>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                검색
              </Button>
            </Col>
          </Row>
        </Form>

        <Divider />

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                onClick={showAssignModal}
                disabled={selectedRowKeys.length === 0}
                style={{ marginRight: 8 }}
              >
                배차 처리 ({selectedRowKeys.length}건)
              </Button>
              <span style={{ marginLeft: 8 }}>
                {selectedRowKeys.length > 0 ? `${selectedRowKeys.length}건 선택됨` : ''}
              </span>
            </div>
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: onSelectChange,
              }}
              columns={columns}
              dataSource={data?.data?.data || []}
              rowKey="dashboard_id"
              pagination={{
                current: searchParams.page,
                pageSize: searchParams.size,
                total: data?.data?.meta?.total || 0,
              }}
              onChange={handleTableChange}
              scroll={{ x: 1000 }}
              size="middle"
            />
          </>
        )}
      </Card>

      {/* 상태 변경 모달 */}
      <CommonModal
        visible={statusModalVisible}
        title="상태 변경"
        onOk={handleStatusSubmit}
        onCancel={() => {
          setStatusModalVisible(false);
          handleReleaseLock(currentDashboard?.dashboard_id, 'STATUS');
        }}
        confirmLoading={statusMutation.isLoading}
        content={
          <Form form={statusForm} layout="vertical">
            <Form.Item
              name="status"
              label="상태"
              rules={[{ required: true, message: '상태를 선택해주세요' }]}
            >
              <Select placeholder="상태 선택">
                {currentDashboard?.status === 'WAITING' && (
                  <>
                    <Option value="IN_PROGRESS">진행</Option>
                    <Option value="CANCEL">취소</Option>
                  </>
                )}
                {currentDashboard?.status === 'IN_PROGRESS' && (
                  <>
                    <Option value="COMPLETE">완료</Option>
                    <Option value="ISSUE">이슈</Option>
                    <Option value="CANCEL">취소</Option>
                  </>
                )}
              </Select>
            </Form.Item>
          </Form>
        }
      />

      {/* 배차 처리 모달 */}
      <CommonModal
        visible={assignModalVisible}
        title="배차 처리"
        onOk={handleAssignSubmit}
        onCancel={() => {
          setAssignModalVisible(false);
          // 다중 락 해제
          selectedRowKeys.forEach(id => {
            handleReleaseLock(id, 'ASSIGN');
          });
        }}
        confirmLoading={assignMutation.isLoading}
        content={
          <Form form={assignForm} layout="vertical">
            <Form.Item
              name="driver_name"
              label="기사명"
              rules={[{ required: true, message: '기사명을 입력해주세요' }]}
            >
              <Input placeholder="기사명 입력" />
            </Form.Item>
            <Form.Item
              name="driver_contact"
              label="연락처"
              rules={[
                { required: true, message: '연락처를 입력해주세요' },
                {
                  pattern: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/,
                  message: '올바른 연락처 형식이 아닙니다',
                }
              ]}
            >
              <Input placeholder="연락처 입력 (예: 010-1234-5678)" />
            </Form.Item>
          </Form>
        }
      />

      {/* 상세 정보 드로어 */}
      <Drawer
        title="상세 정보"
        width={600}
        onClose={() => setDetailVisible(false)}
        visible={detailVisible}
      >
        {currentDashboard && (
          <Form form={detailForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="주문번호" name="order_no">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="유형" name="type">
                  <Select disabled>
                    <Option value="DELIVERY">배송</Option>
                    <Option value="RETURN">회수</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="상태" name="status">
                  <Select disabled>
                    <Option value="WAITING">대기</Option>
                    <Option value="IN_PROGRESS">진행</Option>
                    <Option value="COMPLETE">완료</Option>
                    <Option value="ISSUE">이슈</Option>
                    <Option value="CANCEL">취소</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="부서" name="department">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="창고" name="warehouse">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="SLA" name="sla">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="ETA" name="eta">
                  <DatePicker showTime disabled style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="생성시간" name="create_time">
                  <DatePicker showTime disabled style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="출발시간" name="depart_time">
                  <DatePicker showTime disabled style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="완료시간" name="complete_time">
                  <DatePicker showTime disabled style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="우편번호" name="postal_code">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item label="지역" name="region">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="주소" name="address">
              <Input.TextArea disabled rows={2} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="고객명" name="customer">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="연락처" name="contact">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="기사명" name="driver_name">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="기사 연락처" name="driver_contact">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="메모" name="remark">
              <Input.TextArea disabled rows={4} />
            </Form.Item>
          </Form>
        )}
      </Drawer>

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={handleRetryLock}
        onCancel={handleCancelLock}
        confirmLoading={false}
      />
      {/* 새 대시보드 생성 모달 */}
      <CreateDashboardModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
      />
    </div>
  );
};

export default DashboardPage;