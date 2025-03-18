// src/components/admin/AdminComponents.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Table,
  Button,
  Input,
  Form,
  Select,
  Tag,
  Popconfirm,
  message,
  DatePicker,
  Empty,
  Alert,
  Statistic,
  Modal,
  Divider,
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  DatabaseOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { FONT_STYLES, DEPARTMENT_TEXTS } from '../../utils/Constants';
import DashboardService from '../../services/DashboardService';
import AuthService from '../../services/AuthService';
import { useAuth } from '../../contexts/AuthContext';
import { useLogger } from '../../utils/LogUtils';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 관리자 대시보드 종합 컴포넌트
 * 사용자 관리, 시스템 설정, 데이터 관리 기능 제공
 */
const AdminComponents = () => {
  const logger = useLogger('AdminComponents');
  const { user } = useAuth();

  // 상태 관리
  const [activeTab, setActiveTab] = useState('users');
  const [userList, setUserList] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [dataStats, setDataStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataRange, setDataRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();

  // 초기 데이터 로드
  useEffect(() => {
    // 관리자 권한 검증
    if (!user || user.user_role !== 'ADMIN') {
      logger.warn('관리자 권한이 없는 사용자 접근:', user?.user_id);
      message.error('관리자 권한이 필요합니다');
      return;
    }

    logger.info('관리자 컴포넌트 초기화:', user?.user_id);
    loadMockData();

    // 기존 데이터 정리
    return () => {
      logger.info('관리자 컴포넌트 언마운트');
    };
  }, [user]);

  // Mock 데이터 로드 함수 (실제 구현 시 API 호출로 대체)
  const loadMockData = useCallback(() => {
    setLoading(true);

    // 데이터 로딩 시뮬레이션
    setTimeout(() => {
      // Mock 사용자 데이터
      const mockUsers = [
        {
          id: 1,
          user_id: 'admin1',
          user_role: 'ADMIN',
          user_department: 'CS',
          created_at: '2025-01-15T09:00:00',
        },
        {
          id: 2,
          user_id: 'user1',
          user_role: 'USER',
          user_department: 'HES',
          created_at: '2025-01-20T10:30:00',
        },
        {
          id: 3,
          user_id: 'user2',
          user_role: 'USER',
          user_department: 'LENOVO',
          created_at: '2025-02-05T14:45:00',
        },
      ];

      // Mock 시스템 설정
      const mockSettings = {
        api_timeout: 30000,
        refresh_interval: 60000,
        default_date_range: 30,
        lock_mechanism: 'pessimistic',
        allow_concurrent_edits: false,
      };

      // Mock 데이터 통계
      const mockStats = {
        total_orders: 2854,
        completed_orders: 1852,
        issues_count: 124,
        average_completion_time: 35.8,
        peak_hours: [14, 15, 16],
      };

      setUserList(mockUsers);
      setSystemSettings(mockSettings);
      setDataStats(mockStats);
      setLoading(false);
      logger.info('관리자 데이터 로드 완료');
    }, 800);
  }, [logger]);

  // 사용자 추가/편집 모달 열기
  const openUserModal = useCallback(
    (user = null) => {
      setEditingUser(user);
      setShowUserModal(true);

      if (user) {
        // 편집 모드 - 기존 데이터 설정
        userForm.setFieldsValue({
          user_id: user.user_id,
          user_role: user.user_role,
          user_department: user.user_department,
        });
      } else {
        // 추가 모드 - 폼 초기화
        userForm.resetFields();
      }
    },
    [userForm]
  );

  // 사용자 저장 처리
  const handleSaveUser = useCallback(
    async (values) => {
      try {
        // 저장 처리 (실제로는 API 호출)
        logger.info(`사용자 ${editingUser ? '수정' : '추가'}:`, values);

        // Mock API 응답 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (editingUser) {
          // 기존 사용자 수정
          setUserList((prevUsers) =>
            prevUsers.map((u) =>
              u.id === editingUser.id ? { ...u, ...values } : u
            )
          );
          message.success(`사용자 ${values.user_id} 정보가 수정되었습니다`);
        } else {
          // 새 사용자 추가
          const newUser = {
            id: Math.max(...userList.map((u) => u.id), 0) + 1,
            ...values,
            created_at: new Date().toISOString(),
          };
          setUserList((prev) => [...prev, newUser]);
          message.success(`사용자 ${values.user_id}가 추가되었습니다`);
        }

        setShowUserModal(false);
      } catch (error) {
        logger.error('사용자 저장 오류:', error);
        message.error('사용자 정보 저장 중 오류가 발생했습니다');
      }
    },
    [editingUser, userList, logger]
  );

  // 사용자 삭제 처리
  const handleDeleteUser = useCallback(
    async (userId) => {
      try {
        logger.info('사용자 삭제 요청:', userId);

        // Mock API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        setUserList((prev) => prev.filter((u) => u.id !== userId));
        message.success('사용자가 삭제되었습니다');
      } catch (error) {
        logger.error('사용자 삭제 오류:', error);
        message.error('사용자 삭제 중 오류가 발생했습니다');
      }
    },
    [logger]
  );

  // 시스템 설정 저장
  const handleSaveSettings = useCallback(
    async (values) => {
      try {
        logger.info('시스템 설정 저장:', values);

        // Mock API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        setSystemSettings(values);
        message.success('시스템 설정이 저장되었습니다');
      } catch (error) {
        logger.error('설정 저장 오류:', error);
        message.error('설정 저장 중 오류가 발생했습니다');
      }
    },
    [logger]
  );

  // 데이터 내보내기 처리
  const handleExportData = useCallback(async () => {
    try {
      if (!dataRange || dataRange.length !== 2) {
        message.warning('유효한 날짜 범위를 선택해주세요');
        return;
      }

      logger.info('데이터 내보내기 요청:', {
        startDate: dataRange[0].format('YYYY-MM-DD'),
        endDate: dataRange[1].format('YYYY-MM-DD'),
      });

      // 실제 구현에서는 백엔드 API를 호출하여 CSV 파일 다운로드
      message.loading('데이터 추출 중...', 1.5);

      // Mock API 호출 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1500));

      message.success('데이터 내보내기가 완료되었습니다');
    } catch (error) {
      logger.error('데이터 내보내기 오류:', error);
      message.error('데이터 내보내기 중 오류가 발생했습니다');
    }
  }, [dataRange, logger]);

  // 데이터 정리 처리
  const handleCleanupData = useCallback(
    async (days) => {
      try {
        logger.info(`${days}일 이상 된 데이터 정리 요청`);

        // Mock API 호출 시뮬레이션
        message.loading('데이터 정리 중...', 2);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        message.success(`${days}일 이상 된 데이터 정리가 완료되었습니다`);

        // 통계 데이터 업데이트
        setDataStats((prev) => ({
          ...prev,
          total_orders: Math.floor(prev.total_orders * 0.8), // 샘플 감소
          completed_orders: Math.floor(prev.completed_orders * 0.7),
        }));
      } catch (error) {
        logger.error('데이터 정리 오류:', error);
        message.error('데이터 정리 중 오류가 발생했습니다');
      }
    },
    [logger]
  );

  // 날짜 범위 변경 처리
  const handleDateRangeChange = useCallback((dates) => {
    if (dates && dates.length === 2) {
      setDataRange(dates);
    }
  }, []);

  // 탭 변경 처리
  const handleTabChange = useCallback(
    (key) => {
      setActiveTab(key);
      logger.debug('탭 변경:', key);
    },
    [logger]
  );

  // 새로고침 처리
  const handleRefresh = useCallback(() => {
    logger.info('관리자 데이터 새로고침');
    loadMockData();
  }, [loadMockData, logger]);

  // 사용자 관리 탭 컴포넌트
  const UserManagementTab = () => {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'user_id',
        key: 'user_id',
        sorter: (a, b) => a.user_id.localeCompare(b.user_id),
      },
      {
        title: '권한',
        dataIndex: 'user_role',
        key: 'user_role',
        render: (role) => (
          <Tag color={role === 'ADMIN' ? 'red' : 'blue'}>{role}</Tag>
        ),
        filters: [
          { text: '관리자', value: 'ADMIN' },
          { text: '일반 사용자', value: 'USER' },
        ],
        onFilter: (value, record) => record.user_role === value,
      },
      {
        title: '부서',
        dataIndex: 'user_department',
        key: 'user_department',
        render: (dept) => DEPARTMENT_TEXTS[dept] || dept,
        filters: Object.entries(DEPARTMENT_TEXTS).map(([key, value]) => ({
          text: value,
          value: key,
        })),
        onFilter: (value, record) => record.user_department === value,
      },
      {
        title: '생성일',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      },
      {
        title: '관리',
        key: 'action',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openUserModal(record)}
            />
            <Popconfirm
              title="사용자를 삭제하시겠습니까?"
              description="이 작업은 되돌릴 수 없습니다."
              onConfirm={() => handleDeleteUser(record.id)}
              okText="삭제"
              cancelText="취소"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="사용자 관리"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openUserModal()}
          >
            새 사용자
          </Button>
        }
      >
        <Table
          dataSource={userList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    );
  };

  // 시스템 설정 탭 컴포넌트
  const SystemSettingsTab = () => {
    const [form] = Form.useForm();

    useEffect(() => {
      form.setFieldsValue(systemSettings);
    }, [systemSettings, form]);

    return (
      <Card title="시스템 설정">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSettings}
          initialValues={systemSettings}
        >
          <Form.Item
            name="api_timeout"
            label="API 타임아웃 (ms)"
            rules={[
              { required: true, message: '필수 항목입니다' },
              {
                type: 'number',
                min: 1000,
                max: 60000,
                message: '1,000~60,000 사이 값을 입력하세요',
              },
            ]}
          >
            <Input type="number" min={1000} max={60000} />
          </Form.Item>

          <Form.Item
            name="refresh_interval"
            label="자동 새로고침 간격 (ms)"
            rules={[
              { required: true, message: '필수 항목입니다' },
              {
                type: 'number',
                min: 10000,
                max: 300000,
                message: '10,000~300,000 사이 값을 입력하세요',
              },
            ]}
          >
            <Input type="number" min={10000} max={300000} />
          </Form.Item>

          <Form.Item
            name="default_date_range"
            label="기본 날짜 범위 (일)"
            rules={[
              { required: true, message: '필수 항목입니다' },
              {
                type: 'number',
                min: 1,
                max: 90,
                message: '1~90 사이 값을 입력하세요',
              },
            ]}
          >
            <Input type="number" min={1} max={90} />
          </Form.Item>

          <Form.Item
            name="lock_mechanism"
            label="락 메커니즘"
            rules={[{ required: true, message: '필수 항목입니다' }]}
          >
            <Select>
              <Option value="pessimistic">비관적 락 (동시 편집 방지)</Option>
              <Option value="optimistic">낙관적 락 (충돌 감지)</Option>
              <Option value="hybrid">하이브리드 (상황에 따라 자동 선택)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="allow_concurrent_edits" label="동시 편집 허용">
            <Select>
              <Option value={false}>아니오 (배타적 락 사용)</Option>
              <Option value={true}>예 (버전 관리 사용)</Option>
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                설정 저장
              </Button>
              <Button onClick={() => form.resetFields()}>초기화</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  // 데이터 관리 탭 컴포넌트
  const DataManagementTab = () => {
    return (
      <Card title="데이터 관리">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card type="inner" title="데이터 통계">
            <Row gutter={[24, 16]}>
              <Col span={6}>
                <Statistic
                  title="전체 주문"
                  value={dataStats.total_orders || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="완료 주문"
                  value={dataStats.completed_orders || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="이슈 발생"
                  value={dataStats.issues_count || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="평균 처리 시간"
                  value={dataStats.average_completion_time || 0}
                  suffix="분"
                />
              </Col>
            </Row>
          </Card>

          <Card type="inner" title="데이터 내보내기">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>내보낼 데이터 날짜 범위 선택:</Text>
                <div style={{ marginTop: 8 }}>
                  <RangePicker
                    value={dataRange}
                    onChange={handleDateRangeChange}
                    style={{ width: 300 }}
                  />
                </div>
              </div>
              <Space style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={handleExportData}
                >
                  CSV로 내보내기
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => message.info('Excel 내보내기 개발 중')}
                >
                  Excel로 내보내기
                </Button>
              </Space>
            </Space>
          </Card>

          <Card type="inner" title="데이터 정리">
            <Alert
              message="주의: 데이터 정리"
              description="오래된 데이터를 정리하면 되돌릴 수 없습니다. 필요한 데이터는 먼저 내보내기를 하세요."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Space>
              <Popconfirm
                title="90일 이상 된 데이터를 정리하시겠습니까?"
                description="이 작업은 되돌릴 수 없습니다."
                onConfirm={() => handleCleanupData(90)}
                okText="정리"
                cancelText="취소"
              >
                <Button danger>90일 이상 데이터 정리</Button>
              </Popconfirm>
              <Popconfirm
                title="180일 이상 된 데이터를 정리하시겠습니까?"
                description="이 작업은 되돌릴 수 없습니다."
                onConfirm={() => handleCleanupData(180)}
                okText="정리"
                cancelText="취소"
              >
                <Button danger>180일 이상 데이터 정리</Button>
              </Popconfirm>
              <Popconfirm
                title="모든 취소 상태 주문을 정리하시겠습니까?"
                description="이 작업은 되돌릴 수 없습니다."
                onConfirm={() => {
                  message.loading('취소 상태 주문 정리 중...', 1.5);
                  setTimeout(() => {
                    message.success('취소 상태 주문 정리가 완료되었습니다');
                  }, 1500);
                }}
                okText="정리"
                cancelText="취소"
              >
                <Button danger>취소 상태 주문 정리</Button>
              </Popconfirm>
            </Space>
          </Card>
        </Space>
      </Card>
    );
  };

  // 사용자 추가/편집 모달
  const UserFormModal = () => (
    <Modal
      title={`사용자 ${editingUser ? '수정' : '추가'}`}
      open={showUserModal}
      onCancel={() => setShowUserModal(false)}
      footer={null}
    >
      <Form
        form={userForm}
        layout="vertical"
        onFinish={handleSaveUser}
        initialValues={editingUser || {}}
      >
        <Form.Item
          name="user_id"
          label="사용자 ID"
          rules={[
            { required: true, message: '사용자 ID를 입력하세요' },
            { min: 3, max: 20, message: '3~20자 사이로 입력하세요' },
          ]}
        >
          <Input placeholder="사용자 ID" disabled={!!editingUser} />
        </Form.Item>

        <Form.Item
          name="user_role"
          label="사용자 권한"
          rules={[{ required: true, message: '권한을 선택하세요' }]}
        >
          <Select placeholder="권한 선택">
            <Option value="ADMIN">관리자</Option>
            <Option value="USER">일반 사용자</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="user_department"
          label="부서"
          rules={[{ required: true, message: '부서를 선택하세요' }]}
        >
          <Select placeholder="부서 선택">
            {Object.entries(DEPARTMENT_TEXTS).map(([key, value]) => (
              <Option key={key} value={key}>
                {value}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {!editingUser && (
          <>
            <Form.Item
              name="password"
              label="비밀번호"
              rules={[
                { required: true, message: '비밀번호를 입력하세요' },
                { min: 6, message: '6자 이상 입력하세요' },
              ]}
            >
              <Input.Password placeholder="비밀번호" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="비밀번호 확인"
              rules={[
                { required: true, message: '비밀번호 확인을 입력하세요' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('비밀번호가 일치하지 않습니다')
                    );
                  },
                }),
              ]}
            >
              <Input.Password placeholder="비밀번호 확인" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {editingUser ? '수정' : '추가'}
            </Button>
            <Button onClick={() => setShowUserModal(false)}>취소</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <Title level={4} style={FONT_STYLES.TITLE.MEDIUM}>
          관리자 대시보드
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          새로고침
        </Button>
      </div>

      <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
        <TabPane
          tab={
            <span>
              <UserOutlined />
              사용자 관리
            </span>
          }
          key="users"
        >
          <UserManagementTab />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              시스템 설정
            </span>
          }
          key="settings"
        >
          <SystemSettingsTab />
        </TabPane>

        <TabPane
          tab={
            <span>
              <DatabaseOutlined />
              데이터 관리
            </span>
          }
          key="data"
        >
          <DataManagementTab />
        </TabPane>
      </Tabs>

      {/* 사용자 추가/편집 모달 */}
      <UserFormModal />
    </div>
  );
};

export default AdminComponents;
