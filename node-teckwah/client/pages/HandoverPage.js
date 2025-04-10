import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import {
  Card,
  Button,
  DatePicker,
  Typography,
  Space,
  Row,
  Col,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Checkbox,
  Alert,
  Divider,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  NotificationOutlined,
  PushpinOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/ko_KR';
import useUser from '../hooks/useUser';
import {
  getHandovers,
  createHandover,
  updateHandover,
  deleteHandover,
  acquireHandoverLock,
  releaseHandoverLock,
  getHandoverLockInfo,
} from '../utils/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const HandoverPage = () => {
  // 현재 날짜 기준으로 초기화
  const today = dayjs();
  const [dateRange, setDateRange] = useState([today.subtract(7, 'day'), today]);
  const [formVisible, setFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useUser(); // 현재 사용자 정보
  const isAdmin = user?.user_role === 'ADMIN'; // 관리자 여부 확인

  // 페이지 로드 시 최근 7일 데이터 자동 조회
  useEffect(() => {
    // 이미 dateRange가 설정되어 있으면 자동으로 데이터를 조회함
  }, []);

  // 인수인계 목록 조회
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['handovers', dateRange],
    queryFn: async () => {
      const response = await getHandovers({
        start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: dateRange?.[1]?.format('YYYY-MM-DD'),
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || '인수인계 목록을 불러오는데 실패했습니다.'
        );
      }

      return response.data.data;
    },
    enabled: !!dateRange,
    refetchOnWindowFocus: false,
  });

  // 락 획득 mutation
  const acquireLockMutation = useMutation({
    mutationFn: async (handover_id) => {
      const response = await acquireHandoverLock(handover_id);
      if (!response.data.success) {
        throw new Error(
          response.data.message || '수정 권한을 획득하는데 실패했습니다.'
        );
      }
      return response.data.data;
    },
    onError: (error) => {
      message.error(error.message || '락 획득에 실패했습니다.');
    },
  });

  // 락 해제 mutation
  const releaseLockMutation = useMutation({
    mutationFn: async (handover_id) => {
      const response = await releaseHandoverLock(handover_id);
      if (!response.data.success) {
        throw new Error(
          response.data.message || '수정 권한을 해제하는데 실패했습니다.'
        );
      }
      return response.data.data;
    },
  });

  // 인수인계 생성 mutation
  const createHandoverMutation = useMutation({
    mutationFn: async (values) => {
      const response = await createHandover(values);
      if (!response.data.success) {
        throw new Error(
          response.data.message || '인수인계 작성에 실패했습니다.'
        );
      }
      return response.data.data;
    },
    onSuccess: () => {
      message.success('인수인계가 등록되었습니다.');
      form.resetFields();
      setFormVisible(false);
      queryClient.invalidateQueries(['handovers']);
    },
    onError: (error) => {
      message.error(error.message || '인수인계 등록에 실패했습니다.');
    },
  });

  // 인수인계 수정 mutation
  const updateHandoverMutation = useMutation({
    mutationFn: async (values) => {
      const response = await updateHandover(editRecord.id, values);
      if (!response.data.success) {
        throw new Error(
          response.data.message || '인수인계 수정에 실패했습니다.'
        );
      }
      return response.data.data;
    },
    onSuccess: () => {
      message.success('인수인계가 수정되었습니다.');
      form.resetFields();
      setFormVisible(false);
      // 락 해제
      if (editRecord?.id) {
        releaseLockMutation.mutate(editRecord.id);
      }
      setEditRecord(null);
      queryClient.invalidateQueries(['handovers']);
    },
    onError: (error) => {
      message.error(error.message || '인수인계 수정에 실패했습니다.');
    },
  });

  // 인수인계 삭제 mutation
  const deleteHandoverMutation = useMutation({
    mutationFn: async (id) => {
      const response = await deleteHandover(id);
      if (!response.data.success) {
        throw new Error(
          response.data.message || '인수인계 삭제에 실패했습니다.'
        );
      }
      return id;
    },
    onSuccess: (id) => {
      message.success('인수인계가 삭제되었습니다.');
      // 락 해제
      releaseLockMutation.mutate(id);
      queryClient.invalidateQueries(['handovers']);
    },
    onError: (error) => {
      message.error(error.message || '인수인계 삭제에 실패했습니다.');
    },
  });

  // 인수인계 폼 열기 전에 락 획득
  const tryEditWithLock = async (record) => {
    try {
      // 락 획득 시도
      await acquireLockMutation.mutateAsync(record.id);
      // 락 획득 성공 시 폼 열기
      showForm(record);
    } catch (error) {
      // 락 획득 실패는 에러 핸들러에서 처리됨
    }
  };

  // 인수인계 폼 열기 (생성 또는 수정)
  const showForm = (record = null) => {
    setEditRecord(record);
    setFormVisible(true);

    if (record) {
      // 수정 모드
      const noticeUntil = record.notice_until
        ? dayjs(record.notice_until)
        : null;
      form.setFieldsValue({
        title: record.title,
        content: record.content,
        is_notice: record.is_notice,
        notice_until: noticeUntil,
      });
    } else {
      // 생성 모드
      form.resetFields();
      form.setFieldsValue({
        is_notice: false,
      });
    }
  };

  // 폼 취소 처리
  const handleFormCancel = () => {
    form.resetFields();
    setFormVisible(false);

    // 수정 모드였다면 락 해제
    if (editRecord?.id) {
      releaseLockMutation.mutate(editRecord.id);
    }
    setEditRecord(null);
  };

  // 폼 제출 처리
  const handleFormSubmit = (values) => {
    // 공지 여부와 공지 기간 처리
    if (values.is_notice && !values.notice_until) {
      // 공지 설정 시 날짜가 없으면 1주일 후로 자동 설정
      values.notice_until = dayjs().add(7, 'day').format('YYYY-MM-DD');
    } else if (!values.is_notice) {
      // 공지 해제 시 날짜도 제거
      values.notice_until = null;
    } else if (values.notice_until) {
      // 공지 날짜 포맷 변환
      values.notice_until = values.notice_until.format('YYYY-MM-DD');
    }

    if (editRecord) {
      // 수정 모드
      updateHandoverMutation.mutate(values);
    } else {
      // 생성 모드
      createHandoverMutation.mutate(values);
    }
  };

  // 삭제 처리
  const handleDelete = async (record) => {
    Modal.confirm({
      title: '인수인계 삭제',
      content: '정말로 이 인수인계를 삭제하시겠습니까?',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          // 락 획득 후 삭제
          await acquireLockMutation.mutateAsync(record.id);
          deleteHandoverMutation.mutate(record.id);
        } catch (error) {
          message.error('삭제할 권한이 없습니다.');
        }
      },
    });
  };

  // 날짜 범위 변경 처리
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // 새로고침 처리
  const handleRefresh = () => {
    refetch();
    message.success('인수인계 목록을 새로고침했습니다.');
  };

  // 날짜 헤더 포맷
  const formatDateHeader = (dateStr) => {
    const date = dayjs(dateStr);
    return date.format('YYYY년 MM월 DD일 (ddd)');
  };

  // 시간 포맷
  const formatTime = (dateTimeStr) => {
    const time = dayjs(dateTimeStr);
    return time.format('HH:mm');
  };

  // 공지 만료 여부 확인
  const isNoticeExpired = (notice_until) => {
    return notice_until && dayjs(notice_until).isBefore(dayjs());
  };

  // 공지 남은 일수 계산
  const getRemainingDays = (notice_until) => {
    if (!notice_until) return null;

    const today = dayjs().startOf('day');
    const expireDate = dayjs(notice_until).startOf('day');
    const days = expireDate.diff(today, 'day');

    if (days < 0) return '만료됨';
    if (days === 0) return '오늘까지';
    return `${days}일 남음`;
  };

  // 인수인계 데이터 가공 (날짜별 그룹화 및 정렬)
  const getProcessedHandovers = () => {
    if (!data || !Array.isArray(data)) return [];

    // 날짜별로 그룹화
    const groupedByDate = data.reduce((groups, item) => {
      const date = dayjs(item.created_at).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {});

    // 날짜별로 정렬하고 데이터 포맷
    return Object.keys(groupedByDate)
      .sort((a, b) => dayjs(b).diff(dayjs(a))) // 최근 날짜 순
      .map((date) => ({
        date,
        items: groupedByDate[date].sort((a, b) =>
          dayjs(b.created_at).diff(dayjs(a.created_at))
        ),
      }));
  };

  // 인수인계 카드 렌더링
  const renderHandoverGroups = () => {
    const processedData = getProcessedHandovers();

    if (processedData.length === 0) {
      return (
        <Empty
          description="해당 기간에 인수인계 내용이 없습니다."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return processedData.map((group) => (
      <div key={group.date} className="handover-group">
        <div className="date-header">
          <Title level={4}>{formatDateHeader(group.date)}</Title>
          <Divider style={{ margin: '12px 0' }} />
        </div>
        <Row gutter={[16, 16]} className="handover-items">
          {group.items.map((item) => (
            <Col xs={24} sm={24} md={12} lg={8} xl={8} key={item.id}>
              <Card
                className="handover-card"
                hoverable
                extra={
                  <Space>
                    {item.is_notice && (
                      <Tooltip
                        title={`공지: ${getRemainingDays(item.notice_until)}`}
                      >
                        <Tag
                          color={
                            isNoticeExpired(item.notice_until)
                              ? 'default'
                              : 'red'
                          }
                          icon={<NotificationOutlined />}
                        >
                          공지
                        </Tag>
                      </Tooltip>
                    )}
                    {(isAdmin || item.created_by === user?.user_id) && (
                      <>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            tryEditWithLock(item);
                          }}
                          size="small"
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          size="small"
                        />
                      </>
                    )}
                  </Space>
                }
                title={
                  <div className="handover-title">
                    <Text
                      strong
                      ellipsis
                      style={{ maxWidth: 'calc(100% - 60px)' }}
                    >
                      {item.title}
                    </Text>
                  </div>
                }
              >
                <div className="handover-content">
                  <div className="handover-text">
                    {item.content.split('\n').map((line, i) => (
                      <div key={i}>{line || <br />}</div>
                    ))}
                  </div>
                  <div className="handover-footer">
                    <Text type="secondary">
                      {item.created_by} | {formatTime(item.created_at)}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    ));
  };

  return (
    <div className="handover-page">
      <PageHeader title="인수인계" />
      
      <Card>
        <Row gutter={[16, 16]} className="handover-header">
          <Col xs={24} md={16}>
            <Space direction="vertical" size="small">
              <Title level={2}>인수인계</Title>
              <Space size="middle" align="center">
                <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                  새로고침
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showForm()}
              style={{ marginTop: '32px' }}
            >
              인수인계 작성
            </Button>
          </Col>
        </Row>

        <Divider />

        {isLoading ? (
          <div className="loading-container">
            <Spin size="large" tip="인수인계 목록을 불러오는 중입니다..." />
          </div>
        ) : error ? (
          <Alert
            message="데이터 로딩 오류"
            description={
              error.message || '인수인계 목록을 불러오는데 실패했습니다.'
            }
            type="error"
            showIcon
            action={
              <Button size="small" onClick={refetch}>
                다시 시도
              </Button>
            }
          />
        ) : (
          <div className="handover-list">{renderHandoverGroups()}</div>
        )}
      </Card>

      {/* 인수인계 작성/수정 모달 */}
      <Modal
        title={editRecord ? '인수인계 수정' : '인수인계 작성'}
        open={formVisible}
        onCancel={handleFormCancel}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ is_notice: false, notice_until: null }}
        >
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력해주세요.' }]}
          >
            <Input placeholder="인수인계 제목을 입력하세요" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력해주세요.' }]}
          >
            <TextArea
              placeholder="인수인계 내용을 입력하세요"
              autoSize={{ minRows: 5, maxRows: 15 }}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          {isAdmin && (
            <div className="notice-options">
              <Form.Item name="is_notice" valuePropName="checked">
                <Checkbox>공지로 등록</Checkbox>
              </Form.Item>

              <Form.Item
                name="notice_until"
                label="공지 기간"
                dependencies={['is_notice']}
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  locale={locale}
                  format="YYYY-MM-DD"
                  placeholder="공지 종료일"
                  disabledDate={(current) =>
                    current && current < dayjs().startOf('day')
                  }
                  disabled={!form.getFieldValue('is_notice')}
                />
              </Form.Item>
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleFormCancel}>취소</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={
                  createHandoverMutation.isLoading ||
                  updateHandoverMutation.isLoading
                }
              >
                {editRecord ? '수정' : '작성'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default HandoverPage;