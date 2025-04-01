import React, { useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Card,
  Divider,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import {
  getAvailableStatusTransitions,
  getStatusText,
  getStatusColor,
} from '../utils/permissionUtils';

const { Option } = Select;
const { Text } = Typography;

/**
 * 대시보드 상세 정보 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onCancel - 닫기 핸들러
 * @param {Function} props.onStatusChange - 상태 변경 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {Object} props.dashboard - 대시보드 데이터
 * @param {string} props.userRole - 사용자 권한
 */
const DashboardDetailModal = ({
  open,
  onCancel,
  onStatusChange,
  form,
  dashboard,
  userRole = 'USER',
  confirmLoading = false,
}) => {
  const [isStatusEditing, setIsStatusEditing] = useState(false);

  // 현재 상태에 따라 선택 가능한 상태 옵션 계산
  const statusOptions = useMemo(() => {
    if (!dashboard) return [];

    const availableStatuses = getAvailableStatusTransitions(
      dashboard.status,
      userRole
    );

    return availableStatuses.map((status) => (
      <Option key={status} value={status}>
        {getStatusText(status)}
      </Option>
    ));
  }, [dashboard, userRole]);

  // 상태 변경 모드 토글
  const toggleStatusEdit = () => {
    setIsStatusEditing(!isStatusEditing);
    if (!isStatusEditing && dashboard) {
      // 편집 모드 시작 시 현재 상태값 설정
      form.setFieldsValue({ status: dashboard.status });
    }
  };

  // 상태 변경 확인
  const handleStatusChange = () => {
    form
      .validateFields(['status'])
      .then((values) => {
        onStatusChange && onStatusChange(values.status);
        setIsStatusEditing(false);
      })
      .catch((error) => {
        console.error('상태 변경 유효성 검사 실패:', error);
      });
  };

  // 상태 변경 취소
  const handleStatusCancel = () => {
    setIsStatusEditing(false);
    if (dashboard) {
      form.setFieldsValue({ status: dashboard.status });
    }
  };

  // 상태 필드 - 편집 모드에 따라 다르게 렌더링
  const renderStatusField = () => {
    const isDisabled = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(
      dashboard?.status
    );

    if (isStatusEditing) {
      return (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="상태"
                name="status"
                rules={[{ required: true, message: '상태를 선택해주세요' }]}
              >
                <Select placeholder="상태 선택" size="large">
                  {statusOptions}
                </Select>
              </Form.Item>
            </Col>
            <Col
              span={8}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                marginBottom: '8px',
              }}
            >
              <Space>
                <Button type="primary" onClick={handleStatusChange}>
                  확인
                </Button>
                <Button onClick={handleStatusCancel}>취소</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      );
    }

    return (
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title="현재 상태"
        extra={
          <Button
            type="primary"
            onClick={toggleStatusEdit}
            disabled={isDisabled}
            size="small"
          >
            상태 변경
          </Button>
        }
      >
        <Tag
          color={getStatusColor(dashboard?.status)}
          style={{ fontSize: '16px', padding: '4px 8px' }}
        >
          {getStatusText(dashboard?.status)}
        </Tag>
      </Card>
    );
  };

  if (!dashboard) {
    return null;
  }

  return (
    <Modal
      title="주문 상세 정보"
      width={900}
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...dashboard,
          // 명시적으로 dayjs 형식으로 날짜 변환
          eta: dashboard.eta ? dayjs(dashboard.eta) : null,
          updated_at: dashboard.updated_at ? dayjs(dashboard.updated_at) : null,
        }}
      >
        {renderStatusField()}

        <Card size="small" title="기본 정보" style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="주문번호" name="order_no">
                <Input disabled style={{ fontWeight: 'bold' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="유형" name="type">
                <Select disabled>
                  <Option value="DELIVERY">배송</Option>
                  <Option value="RETURN">회수</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="고객명" name="customer">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="부서" name="department">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="창고" name="warehouse">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="SLA" name="sla">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card size="small" title="배송 정보" style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="ETA" name="eta">
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:MM"
                  disabled
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="출발 시간" name="depart_time">
                <Input
                  disabled
                  value={
                    dashboard.depart_time
                      ? dayjs(dashboard.depart_time).format('YYYY-MM-DD HH:MM')
                      : '-'
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="완료 시간" name="complete_time">
                <Input
                  disabled
                  value={
                    dashboard.complete_time
                      ? dayjs(dashboard.complete_time).format(
                          'YYYY-MM-DD HH:MM'
                        )
                      : '-'
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="배송기사" name="driver_name">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="기사 연락처" name="driver_contact">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item label="배송 주소" name="delivery_address">
                <Input.TextArea rows={2} disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card size="small" title="추가 정보" style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item label="메모" name="note">
                <Input.TextArea rows={2} disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div style={{ textAlign: 'right', color: '#999' }}>
          <Space direction="vertical" size={0} style={{ fontSize: '12px' }}>
            <Text type="secondary">수정자: {dashboard.updated_by || '-'}</Text>
            <Text type="secondary">
              수정일:{' '}
              {dashboard.updated_at
                ? dayjs(dashboard.updated_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Text>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default DashboardDetailModal;
