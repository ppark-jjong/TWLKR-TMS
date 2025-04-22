/**
 * 주문 상세 모달 컴포넌트
 * - 중앙화된 상수 및 공통 컴포넌트 사용
 */
import React, { useState, useEffect } from 'react';
import {
  Descriptions,
  Button,
  Space,
  Typography,
  Divider,
  Form,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
  message,
} from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { StatusTag, BaseModal } from '../common';
import { DashboardService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  WAREHOUSE_OPTIONS,
  STATUS_TRANSITIONS,
} from '../../constants';
import { useLock } from '../../hooks';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * 주문 상세 정보 모달
 * @param {boolean} visible - 모달 표시 여부
 * @param {number} orderId - 주문 ID
 * @param {Function} onCancel - 닫기 콜백
 * @param {Function} onSuccess - 성공 콜백
 */
const OrderDetailModal = ({ visible, orderId, onCancel, onSuccess }) => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  // 락 관련 커스텀 훅 사용
  const { acquireLock, releaseLock, isLocked } = useLock(
    DashboardService,
    '주문'
  );

  /**
   * 주문 조회 (camelCase 사용)
   */
  const fetchOrder = async () => {
    if (!orderId) return;

    setLoading(true);

    try {
      const response = await DashboardService.getOrder(orderId);

      if (response.success) {
        setOrder(response.data);

        // 폼 필드 초기값 설정 (camelCase 사용)
        form.setFieldsValue({
          orderNo: response.data.orderNo,
          type: response.data.type,
          status: response.data.status,
          department: response.data.department,
          warehouse: response.data.warehouse,
          sla: response.data.sla,
          eta: response.data.eta ? dayjs(response.data.eta) : null,
          postalCode: response.data.postalCode,
          address: response.data.address,
          customer: response.data.customer,
          contact: response.data.contact,
          driverName: response.data.driverName,
          driverContact: response.data.driverContact,
          remark: response.data.remark,
        });
      } else {
        message.error(response.message || '주문 조회 실패');
      }
    } catch (error) {
      console.error('주문 조회 중 오류 발생:', error);
      message.error('주문 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 주문 ID 변경 시 데이터 조회
   */
  useEffect(() => {
    if (visible && orderId) {
      fetchOrder();
    }

    // 모달 닫힐 때 락 해제
    return () => {
      if (isLocked && orderId) {
        releaseLock(orderId);
      }
    };
  }, [visible, orderId]);

  /**
   * 주문 수정 모드 토글
   */
  const toggleEdit = async () => {
    if (editing) {
      // 수정 모드 종료
      setEditing(false);

      // 락 해제
      if (orderId) {
        await releaseLock(orderId);
      }
    } else {
      // 수정 모드 진입 (락 획득)
      const locked = await acquireLock(orderId);
      if (locked) {
        setEditing(true);
      }
    }
  };

  /**
   * 주문 상태 변경이 가능한지 확인
   */
  const canChangeStatus = (currentStatus, newStatus) => {
    const role = currentUser?.userRole || 'USER';
    return (
      STATUS_TRANSITIONS[role]?.[currentStatus]?.includes(newStatus) || false
    );
  };

  /**
   * 주문 상태 변경
   */
  const handleStatusChange = async (status) => {
    if (!orderId) return;

    try {
      setSubmitting(true);

      // 락 획득 확인
      const locked = await acquireLock(orderId);
      if (!locked) return;

      const response = await DashboardService.updateOrderStatus(
        orderId,
        status
      );

      if (response.success) {
        message.success('주문 상태가 변경되었습니다');
        setOrder(response.data);

        // 성공 콜백 호출
        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.error(response.message || '상태 변경 실패');
      }

      // 락 해제
      await releaseLock(orderId);
    } catch (error) {
      console.error('상태 변경 중 오류 발생:', error);
      message.error('상태 변경 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 주문 정보 수정 (camelCase 사용)
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      // 날짜 필드 변환 및 camelCase 사용 확인
      const updateData = {
        ...values,
        eta: values.eta?.toISOString(),
        // Form.Item name들이 이미 camelCase이므로 별도 변환 불필요
      };
      const response = await DashboardService.updateOrder(orderId, updateData);
      if (response.success) {
        message.success('주문 정보가 수정되었습니다');
        setOrder(response.data);
        setEditing(false);
        await releaseLock(orderId);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.error(response.message || '주문 수정 실패');
      }
    } catch (error) {
      console.error('주문 수정 중 오류 발생:', error);
      message.error('주문 수정 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 모달 닫기 처리
   */
  const handleClose = async () => {
    // 수정 모드면 락 해제
    if (editing && orderId) {
      await releaseLock(orderId);
    }

    // 편집 모드 해제
    setEditing(false);

    // 취소 콜백 호출
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * 현재 상태에 따른 액션 버튼 렌더링
   */
  const renderStatusActions = () => {
    if (!order) return null;

    // 현재 상태 액션 버튼 배열
    const actions = [];

    // 사용자 권한에 따른 허용 상태 변경
    const allowedStatuses =
      STATUS_TRANSITIONS[currentUser?.userRole || 'USER'][order.status] || [];

    // 허용된 상태 변경 버튼 추가
    allowedStatuses.forEach((status) => {
      const statusInfo = STATUS_OPTIONS.find((opt) => opt.value === status);
      if (statusInfo) {
        // 버튼 타입 설정 (완료=primary, 이슈=danger, 취소=default, 그외=primary)
        const buttonType =
          status === 'COMPLETE'
            ? 'primary'
            : status === 'ISSUE'
            ? 'danger'
            : status === 'CANCEL'
            ? 'default'
            : 'primary';

        actions.push(
          <Button
            key={status}
            type={buttonType}
            onClick={() => handleStatusChange(status)}
            loading={submitting}
            icon={statusInfo.icon}
          >
            {statusInfo.label}
          </Button>
        );
      }
    });

    return (
      <Space>
        {actions}

        {/* 관리자는 모든 상태에서 편집 가능 */}
        {currentUser?.userRole === 'ADMIN' && (
          <Button
            type={editing ? 'default' : 'dashed'}
            icon={editing ? <CloseOutlined /> : <EditOutlined />}
            onClick={toggleEdit}
          >
            {editing ? '편집 취소' : '정보 수정'}
          </Button>
        )}

        {editing && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={submitting}
          >
            저장
          </Button>
        )}
      </Space>
    );
  };

  // 모달 푸터 버튼
  const modalFooter = [
    <Button key="close" onClick={handleClose}>
      닫기
    </Button>,
  ];

  return (
    <BaseModal
      title={`주문 상세정보 (ID: ${orderId})`}
      visible={visible}
      onCancel={handleClose}
      width={800}
      footer={modalFooter}
      loading={loading}
      destroyOnClose
    >
      {order && (
        <>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {order.orderNo}
              </Title>
              <Text type="secondary">
                <StatusTag status={order.type} type="orderType" /> |{' '}
                {order.department} | {order.warehouse}
              </Text>
            </div>
            <StatusTag status={order.status} showIcon />
          </div>

          {editing ? (
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="주문번호"
                    name="orderNo"
                    rules={[
                      { required: true, message: '주문번호를 입력하세요' },
                    ]}
                  >
                    <Input readOnly />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="주문유형"
                    name="type"
                    rules={[
                      { required: true, message: '주문유형을 선택하세요' },
                    ]}
                  >
                    <Select>
                      {TYPE_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="상태"
                    name="status"
                    rules={[{ required: true, message: '상태를 선택하세요' }]}
                  >
                    <Select disabled>
                      {STATUS_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="부서"
                    name="department"
                    rules={[{ required: true, message: '부서를 선택하세요' }]}
                  >
                    <Select>
                      {DEPARTMENT_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="창고"
                    name="warehouse"
                    rules={[{ required: true, message: '창고를 선택하세요' }]}
                  >
                    <Select>
                      {WAREHOUSE_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="SLA"
                    name="sla"
                    rules={[{ required: true, message: 'SLA를 입력하세요' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="ETA"
                    name="eta"
                    rules={[{ required: true, message: 'ETA를 선택하세요' }]}
                  >
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="우편번호"
                    name="postalCode"
                    rules={[
                      { required: true, message: '우편번호를 입력하세요' },
                    ]}
                  >
                    <Input maxLength={5} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="고객명"
                    name="customer"
                    rules={[{ required: true, message: '고객명을 입력하세요' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="주소"
                name="address"
                rules={[{ required: true, message: '주소를 입력하세요' }]}
              >
                <Input />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="연락처" name="contact">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="기사 이름" name="driverName">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="기사 연락처" name="driverContact">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="비고" name="remark">
                <TextArea rows={4} />
              </Form.Item>
            </Form>
          ) : (
            <>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="주문유형">
                  <StatusTag status={order.type} type="orderType" />
                </Descriptions.Item>
                <Descriptions.Item label="상태">
                  <StatusTag status={order.status} />
                </Descriptions.Item>
                <Descriptions.Item label="부서">
                  {order.department}
                </Descriptions.Item>
                <Descriptions.Item label="창고">
                  {order.warehouse}
                </Descriptions.Item>
                <Descriptions.Item label="SLA">{order.sla}</Descriptions.Item>
                <Descriptions.Item label="ETA">
                  {dayjs(order.eta).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="생성시간">
                  {dayjs(order.createTime).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="출발시간">
                  {order.departTime
                    ? dayjs(order.departTime).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="완료시간" span={2}>
                  {order.completeTime
                    ? dayjs(order.completeTime).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="우편번호">
                  {order.postalCode}
                </Descriptions.Item>
                <Descriptions.Item label="주소" span={2}>
                  {order.address}
                </Descriptions.Item>
                <Descriptions.Item label="고객명">
                  {order.customer}
                </Descriptions.Item>
                <Descriptions.Item label="연락처">
                  {order.contact || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="기사 이름">
                  {order.driverName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="기사 연락처">
                  {order.driverContact || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="비고" span={2}>
                  {order.remark || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="최종 수정자">
                  {order.updatedBy || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="수정 시간">
                  {order.updateAt
                    ? dayjs(order.updateAt).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}

          <Divider />

          <div style={{ textAlign: 'right' }}>{renderStatusActions()}</div>
        </>
      )}
    </BaseModal>
  );
};

export default OrderDetailModal;
