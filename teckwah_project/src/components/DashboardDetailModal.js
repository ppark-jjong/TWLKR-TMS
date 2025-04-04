import React, { useState, useMemo, memo } from 'react';
import {
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
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import {
  getAvailableStatusTransitions,
  getStatusText,
  getStatusColor,
} from '../utils/permissionUtils';
import OptimizedBaseModal from './OptimizedBaseModal';

const { Option } = Select;
const { Text } = Typography;

/**
 * 대시보드 상세 정보 모달 컴포넌트
 * 최적화 포인트:
 * 1. OptimizedBaseModal 사용
 * 2. memo를 통한 컴포넌트 리렌더링 최적화
 * 3. useMemo를 통한 계산 최적화
 * 4. 인라인 스타일 중앙화
 * 
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

  // 현재 상태에 따라 선택 가능한 상태 옵션 계산 (메모이제이션)
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

  // 중앙화된 스타일 정의
  const styles = {
    card: {
      marginBottom: 16
    },
    statusTag: {
      fontSize: '16px', 
      padding: '4px 8px'
    },
    buttonsContainer: {
      display: 'flex',
      alignItems: 'flex-end',
      marginBottom: '8px'
    },
    footer: {
      textAlign: 'right', 
      color: '#999'
    },
    metaText: {
      fontSize: '12px'
    }
  };

  // 상태 필드 - 편집 모드에 따라 다르게 렌더링
  const renderStatusField = useMemo(() => {
    if (!dashboard) return null;
    
    const isDisabled = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(
      dashboard?.status
    );

    if (isStatusEditing) {
      return (
        <Card size="small" style={styles.card}>
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
            <Col span={8} style={styles.buttonsContainer}>
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
        style={styles.card}
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
          style={styles.statusTag}
        >
          {getStatusText(dashboard?.status)}
        </Tag>
      </Card>
    );
  }, [dashboard, isStatusEditing, statusOptions, handleStatusChange, handleStatusCancel, toggleStatusEdit]);

  // 초기값 계산
  const initialValues = useMemo(() => {
    if (!dashboard) return {};
    
    return {
      ...dashboard,
      // 명시적으로 dayjs 형식으로 날짜 변환
      eta: dashboard.eta ? dayjs(dashboard.eta) : null,
      updated_at: dashboard.updated_at ? dayjs(dashboard.updated_at) : null,
    };
  }, [dashboard]);

  // 대시보드가 없으면 렌더링하지 않음
  if (!dashboard) {
    return null;
  }

  return (
    <OptimizedBaseModal
      title="주문 상세 정보"
      width={900}
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
      >
        {renderStatusField}

        <Card size="small" title="기본 정보" style={styles.card}>
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

        <Card size="small" title="배송 정보" style={styles.card}>
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

        <Card size="small" title="추가 정보" style={styles.card}>
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item label="메모" name="note">
                <Input.TextArea rows={2} disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div style={styles.footer}>
          <Space direction="vertical" size={0} style={styles.metaText}>
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
    </OptimizedBaseModal>
  );
};

// memo를 사용하여 불필요한 리렌더링 방지
export default memo(DashboardDetailModal);
