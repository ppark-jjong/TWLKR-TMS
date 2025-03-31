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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
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
      const response = await updateHandover(editRecord.handover_id, values);
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
      if (editRecord?.handover_id) {
        releaseLockMutation.mutate(editRecord.handover_id);
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
      await acquireLockMutation.mutateAsync(record.handover_id);
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
      form.setFieldsValue({
        title: record.title,
        content: record.content,
      });
    } else {
      form.resetFields();
    }
  };

  // 폼 취소 핸들러
  const handleFormCancel = () => {
    // 락 해제
    if (editRecord?.handover_id) {
      releaseLockMutation.mutate(editRecord.handover_id);
    }
    setFormVisible(false);
    setEditRecord(null);
    form.resetFields();
  };

  // 폼 제출 핸들러
  const handleFormSubmit = (values) => {
    if (editRecord) {
      updateHandoverMutation.mutate(values);
    } else {
      createHandoverMutation.mutate(values);
    }
  };

  // 인수인계 삭제 핸들러
  const handleDelete = async (record) => {
    try {
      // 삭제 전 락 획득
      await acquireLockMutation.mutateAsync(record.handover_id);

      // 락 획득 성공 시 삭제 확인 모달
      Modal.confirm({
        title: '인수인계 삭제',
        content: '정말 삭제하시겠습니까?',
        okText: '삭제',
        okType: 'danger',
        cancelText: '취소',
        onOk: () => {
          deleteHandoverMutation.mutate(record.handover_id);
        },
        onCancel: () => {
          // 취소 시 락 해제
          releaseLockMutation.mutate(record.handover_id);
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

  // 포맷팅된 날짜 (YYYY년 MM월 DD일)
  const formatDateHeader = (dateStr) => {
    const date = dayjs(dateStr);
    return date.format('YYYY년 MM월 DD일');
  };

  // 포맷팅된 시간 (HH:mm)
  const formatTime = (dateTimeStr) => {
    return dayjs(dateTimeStr).format('HH:mm');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>인수인계</Title>
        </Col>
        <Col>
          <Space size="middle">
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

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Card>
          <Empty description="인수인계를 불러오는데 실패했습니다." />
        </Card>
      ) : data?.length === 0 ? (
        <Card>
          <Empty description="해당 기간에 등록된 인수인계가 없습니다." />
        </Card>
      ) : (
        data?.map((dateGroup) => (
          <Card
            key={dateGroup.date}
            title={formatDateHeader(dateGroup.date)}
            style={{ marginBottom: 16 }}
          >
            {dateGroup.records.map((record) => (
              <Card.Grid
                key={record.handover_id}
                style={{ width: '100%', boxShadow: 'none', padding: '16px' }}
              >
                <Row justify="space-between" align="top">
                  <Col span={20}>
                    <Space
                      direction="vertical"
                      size={2}
                      style={{ width: '100%' }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 16 }}>
                          {record.title}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {formatTime(record.effective_date)}
                        </Text>
                        {record.is_locked && (
                          <Tag color="red" style={{ marginLeft: 8 }}>
                            <LockOutlined /> {record.locked_by} 수정 중
                          </Tag>
                        )}
                      </div>
                      <div>
                        <Text type="secondary">
                          작성자: {record.created_by}
                        </Text>
                      </div>
                      <div style={{ whiteSpace: 'pre-line', marginTop: 8 }}>
                        {record.content}
                      </div>
                    </Space>
                  </Col>
                  {record.is_own && !record.is_locked && (
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Space>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => tryEditWithLock(record)}
                        />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(record)}
                        />
                      </Space>
                    </Col>
                  )}
                </Row>
              </Card.Grid>
            ))}
          </Card>
        ))
      )}

      {/* 인수인계 작성/수정 모달 */}
      <Modal
        title={editRecord ? '인수인계 수정' : '인수인계 작성'}
        open={formVisible}
        onCancel={handleFormCancel}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
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
            <TextArea
              placeholder="내용을 입력하세요"
              autoSize={{ minRows: 6, maxRows: 12 }}
            />
          </Form.Item>
          <Form.Item>
            <Row justify="end">
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
            </Row>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HandoverPage;
