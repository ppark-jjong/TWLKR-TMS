import React, { useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  NotificationOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
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
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [formVisible, setFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useUser(); // 현재 사용자 정보
  const isAdmin = user?.user_role === 'ADMIN'; // 관리자 여부 확인

  // 인수인계 목록 조회
  const { data, isLoading, error } = useQuery({
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
      // 새로 작성 모드
      form.resetFields();
    }
  };

  // 폼 취소 핸들러
  const handleFormCancel = () => {
    // 락 해제
    if (editRecord?.id) {
      releaseLockMutation.mutate(editRecord.id);
    }
    setFormVisible(false);
    setEditRecord(null);
  };

  // 폼 제출 핸들러
  const handleFormSubmit = (values) => {
    // 공지 설정 시 종료일 변환
    if (values.notice_until) {
      values.notice_until = values.notice_until.toISOString();
    }

    if (editRecord) {
      // 수정 모드
      updateHandoverMutation.mutate(values);
    } else {
      // 생성 모드
      createHandoverMutation.mutate(values);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (record) => {
    try {
      // 삭제 전 락 획득
      await acquireLockMutation.mutateAsync(record.id);

      // 삭제 확인 모달
      Modal.confirm({
        title: '인수인계 삭제',
        content: '이 인수인계를 삭제하시겠습니까?',
        okText: '삭제',
        okType: 'danger',
        cancelText: '취소',
        onOk: () => {
          deleteHandoverMutation.mutate(record.id);
        },
        onCancel: () => {
          // 취소 시 락 해제
          releaseLockMutation.mutate(record.id);
        },
      });
    } catch (error) {
      // 락 획득 실패는 에러 핸들러에서 처리됨
    }
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // 날짜 헤더 포맷 함수
  const formatDateHeader = (dateStr) => {
    const date = dayjs(dateStr);
    return date.format('YYYY년 MM월 DD일');
  };

  // 시간 포맷 함수
  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    return dayjs(dateTimeStr).format('HH:mm');
  };

  // 공지 종료일 확인 함수
  const isNoticeExpired = (notice_until) => {
    if (!notice_until) return false;
    return dayjs(notice_until).isBefore(dayjs());
  };

  // 공지 종료까지 남은 일수 계산 함수
  const getRemainingDays = (notice_until) => {
    if (!notice_until) return null;
    const now = dayjs();
    const endDate = dayjs(notice_until);
    if (endDate.isBefore(now)) return '만료됨';
    const days = endDate.diff(now, 'day');
    if (days === 0) return '오늘 만료';
    return `${days}일 남음`;
  };

  // 공지 필터링 및 정렬: 공지를 최상단에 표시
  const getProcessedHandovers = () => {
    if (!data) return [];

    // 깊은 복사를 통해 원본 데이터 보존
    const processedData = JSON.parse(JSON.stringify(data));

    // 각 날짜 그룹 내에서 공지를 최상단으로 정렬
    processedData.forEach((dateGroup) => {
      dateGroup.records.sort((a, b) => {
        // 공지가 아닌 경우 원래 순서 유지
        if (!a.is_notice && !b.is_notice) return 0;
        // a만 공지인 경우 a를 앞으로
        if (a.is_notice && !b.is_notice) return -1;
        // b만 공지인 경우 b를 앞으로
        if (!a.is_notice && b.is_notice) return 1;
        // 둘 다 공지인 경우 날짜 기준 정렬
        return dayjs(b.created_at).diff(dayjs(a.created_at));
      });
    });

    return processedData;
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 에러 표시
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Alert
          message="오류 발생"
          description={
            error.message || '인수인계 목록을 불러오는데 실패했습니다.'
          }
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="handover-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3}>인수인계 목록</Title>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                allowClear={false}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showForm()}
              >
                인수인계 작성
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 인수인계 목록 */}
      {!data || data.length === 0 ? (
        <Empty description="인수인계 내역이 없습니다." />
      ) : (
        getProcessedHandovers().map((group) => (
          <div
            key={group.date}
            className="date-group"
            style={{ marginBottom: 20 }}
          >
            <div
              className="date-header"
              style={{
                padding: '10px 15px',
                background: '#f0f2f5',
                borderRadius: '4px',
                marginBottom: '10px',
              }}
            >
              <Text strong>{formatDateHeader(group.date)}</Text>
            </div>

            {group.records.map((record) => (
              <Card
                key={record.id}
                style={{
                  marginBottom: 16,
                  borderLeft:
                    record.is_notice && !isNoticeExpired(record.notice_until)
                      ? '4px solid #1890ff'
                      : 'none',
                  background:
                    record.is_notice && !isNoticeExpired(record.notice_until)
                      ? '#f0f7ff'
                      : 'white',
                  boxShadow:
                    record.is_notice && !isNoticeExpired(record.notice_until)
                      ? '0 2px 8px rgba(24, 144, 255, 0.15)'
                      : 'none',
                }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {record.is_notice &&
                      !isNoticeExpired(record.notice_until) && (
                        <NotificationOutlined
                          style={{ color: '#1890ff', marginRight: 8 }}
                        />
                      )}
                    <Text strong>{record.title}</Text>
                    {record.is_notice &&
                      !isNoticeExpired(record.notice_until) && (
                        <>
                          <Tag color="blue" style={{ marginLeft: 8 }}>
                            공지
                          </Tag>
                          {record.notice_until && (
                            <Tag color="cyan" style={{ marginLeft: 4 }}>
                              {getRemainingDays(record.notice_until)}
                            </Tag>
                          )}
                        </>
                      )}
                  </div>
                }
                extra={
                  <Space>
                    <Text type="secondary">
                      작성자: {record.created_by}
                      {record.updated_at
                        ? ` (수정: ${formatTime(record.updated_at)})`
                        : ''}
                    </Text>
                    {(record.is_owner || isAdmin) && (
                      <>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => tryEditWithLock(record)}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(record)}
                        />
                      </>
                    )}
                  </Space>
                }
              >
                <div
                  style={{ whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: record.content }}
                />
              </Card>
            ))}
          </div>
        ))
      )}

      {/* 인수인계 작성/수정 폼 모달 */}
      <Modal
        title={editRecord ? '인수인계 수정' : '인수인계 작성'}
        open={formVisible}
        onCancel={handleFormCancel}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ is_notice: false }}
        >
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력해주세요' }]}
          >
            <Input placeholder="제목을 입력하세요" />
          </Form.Item>

          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력해주세요' }]}
          >
            <TextArea rows={10} placeholder="내용을 입력하세요" />
          </Form.Item>

          {/* 관리자만 공지 설정 가능 */}
          {isAdmin && (
            <>
              <Form.Item name="is_notice" valuePropName="checked">
                <Checkbox>공지로 설정</Checkbox>
              </Form.Item>

              <Form.Item
                name="notice_until"
                label="공지 종료일 (설정하지 않으면 무기한)"
                dependencies={['is_notice']}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!form.getFieldValue('is_notice')}
                  placeholder="공지 종료일 선택 (선택사항)"
                  disabledDate={(current) =>
                    current && current < dayjs().startOf('day')
                  }
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            style={{ textAlign: 'right', marginBottom: 0, marginTop: 16 }}
          >
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
                {editRecord ? '수정' : '등록'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HandoverPage;
