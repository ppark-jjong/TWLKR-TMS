/**
 * 주문 상세 모달 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { 
  Modal, Descriptions, Button, Space, 
  Typography, Divider, Tag, Form, Select,
  Input, DatePicker, Row, Col, message
} from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import StatusTag from '../common/StatusTag';
import { DashboardService, PostalCodeService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const OrderDetailModal = ({ 
  visible, 
  orderId, 
  onCancel, 
  onSuccess 
}) => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [postalCodeInfo, setPostalCodeInfo] = useState(null);
  
  // 주문 조회
  const fetchOrder = async () => {
    if (!orderId) return;
    
    setLoading(true);
    
    try {
      const response = await DashboardService.getOrder(orderId);
      
      if (response.success) {
        setOrder(response.data);
        
        // 폼 필드 초기값 설정
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
          remark: response.data.remark
        });
        
        // 우편번호 정보 조회
        fetchPostalCode(response.data.postalCode);
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
  
  // 우편번호 정보 조회
  const fetchPostalCode = async (postalCode) => {
    if (!postalCode) return;
    
    try {
      const response = await PostalCodeService.getPostalCode(postalCode);
      
      if (response.success) {
        setPostalCodeInfo(response.data.postalCode);
      }
    } catch (error) {
      console.error('우편번호 조회 중 오류 발생:', error);
    }
  };
  
  // 주문 ID 변경 시 데이터 조회
  useEffect(() => {
    if (visible && orderId) {
      fetchOrder();
    }
  }, [visible, orderId]);
  
  // 주문 수정 모드 토글
  const toggleEdit = () => {
    setEditing(!editing);
  };
  
  // 주문 상태 변경이 가능한지 확인
  const canChangeStatus = (currentStatus, newStatus) => {
    // 관리자는 모든 상태 변경 가능
    if (currentUser?.userRole === 'ADMIN') {
      return true;
    }
    
    // 일반 사용자는 제한된 상태 변경만 가능
    const allowedTransitions = {
      'WAITING': ['IN_PROGRESS'],
      'IN_PROGRESS': ['COMPLETE', 'ISSUE', 'CANCEL']
    };
    
    return allowedTransitions[currentStatus]?.includes(newStatus);
  };
  
  // 주문 상태 변경
  const handleStatusChange = async (status) => {
    if (!orderId) return;
    
    try {
      setSubmitting(true);
      
      const response = await DashboardService.updateOrderStatus(orderId, status);
      
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
    } catch (error) {
      console.error('상태 변경 중 오류 발생:', error);
      message.error('상태 변경 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 주문 정보 수정
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // 날짜 필드 변환
      const updateData = {
        ...values,
        eta: values.eta?.toISOString()
      };
      
      const response = await DashboardService.updateOrder(orderId, updateData);
      
      if (response.success) {
        message.success('주문 정보가 수정되었습니다');
        setOrder(response.data);
        setEditing(false);
        
        // 성공 콜백 호출
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
  
  // 상태별 버튼 동작 설정
  const statusActions = {
    'WAITING': [
      {
        key: 'in_progress',
        label: '진행 시작',
        status: 'IN_PROGRESS',
        type: 'primary',
        hidden: !canChangeStatus('WAITING', 'IN_PROGRESS')
      }
    ],
    'IN_PROGRESS': [
      {
        key: 'complete',
        label: '완료',
        status: 'COMPLETE',
        type: 'primary',
        hidden: !canChangeStatus('IN_PROGRESS', 'COMPLETE')
      },
      {
        key: 'issue',
        label: '이슈',
        status: 'ISSUE',
        type: 'danger',
        hidden: !canChangeStatus('IN_PROGRESS', 'ISSUE')
      },
      {
        key: 'cancel',
        label: '취소',
        status: 'CANCEL',
        type: 'default',
        hidden: !canChangeStatus('IN_PROGRESS', 'CANCEL')
      }
    ]
  };
  
  // 현재 상태에 따른 액션 버튼 렌더링
  const renderStatusActions = () => {
    const actions = statusActions[order?.status] || [];
    
    return (
      <Space>
        {actions.map(action => (
          !action.hidden && (
            <Button
              key={action.key}
              type={action.type}
              onClick={() => handleStatusChange(action.status)}
              loading={submitting}
            >
              {action.label}
            </Button>
          )
        ))}
        
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
  
  return (
    <Modal
      title={`주문 상세정보 (ID: ${orderId})`}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          데이터를 불러오는 중...
        </div>
      ) : (
        order && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {order.orderNo}
                </Title>
                <Text type="secondary">
                  {order.type === 'DELIVERY' ? '배송' : '반품'} | {order.department} | {order.warehouse}
                </Text>
              </div>
              <StatusTag status={order.status} />
            </div>
            
            {editing ? (
              <Form
                form={form}
                layout="vertical"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="주문번호"
                      name="orderNo"
                      rules={[{ required: true, message: '주문번호를 입력하세요' }]}
                    >
                      <Input readOnly />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="주문유형"
                      name="type"
                      rules={[{ required: true, message: '주문유형을 선택하세요' }]}
                    >
                      <Select>
                        <Option value="DELIVERY">배송</Option>
                        <Option value="RETURN">반품</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="상태"
                      name="status"
                      rules={[{ required: true, message: '상태를 선택하세요' }]}
                    >
                      <Select>
                        <Option value="WAITING">대기</Option>
                        <Option value="IN_PROGRESS">진행</Option>
                        <Option value="COMPLETE">완료</Option>
                        <Option value="ISSUE">이슈</Option>
                        <Option value="CANCEL">취소</Option>
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
                        <Option value="CS">CS</Option>
                        <Option value="HES">HES</Option>
                        <Option value="LENOVO">LENOVO</Option>
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
                        <Option value="SEOUL">서울</Option>
                        <Option value="BUSAN">부산</Option>
                        <Option value="GWANGJU">광주</Option>
                        <Option value="DAEJEON">대전</Option>
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
                      <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="우편번호"
                      name="postalCode"
                      rules={[{ required: true, message: '우편번호를 입력하세요' }]}
                    >
                      <Input />
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
                    <Form.Item
                      label="연락처"
                      name="contact"
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="기사 이름"
                      name="driverName"
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="기사 연락처"
                      name="driverContact"
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item
                  label="비고"
                  name="remark"
                >
                  <TextArea rows={4} />
                </Form.Item>
              </Form>
            ) : (
              <>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="주문유형">
                    {order.type === 'DELIVERY' ? '배송' : '반품'}
                  </Descriptions.Item>
                  <Descriptions.Item label="상태">
                    <StatusTag status={order.status} />
                  </Descriptions.Item>
                  <Descriptions.Item label="부서">{order.department}</Descriptions.Item>
                  <Descriptions.Item label="창고">{order.warehouse}</Descriptions.Item>
                  <Descriptions.Item label="SLA">{order.sla}</Descriptions.Item>
                  <Descriptions.Item label="ETA">
                    {dayjs(order.eta).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="생성시간">
                    {dayjs(order.createTime).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="출발시간">
                    {order.departTime ? dayjs(order.departTime).format('YYYY-MM-DD HH:mm') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="완료시간" span={2}>
                    {order.completeTime ? dayjs(order.completeTime).format('YYYY-MM-DD HH:mm') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="우편번호" span={2}>
                    {order.postalCode} ({order.city} {order.county} {order.district})
                  </Descriptions.Item>
                  <Descriptions.Item label="주소" span={2}>
                    {order.address}
                  </Descriptions.Item>
                  <Descriptions.Item label="고객명">{order.customer}</Descriptions.Item>
                  <Descriptions.Item label="연락처">{order.contact || '-'}</Descriptions.Item>
                  <Descriptions.Item label="기사 이름">{order.driverName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="기사 연락처">{order.driverContact || '-'}</Descriptions.Item>
                  <Descriptions.Item label="거리/소요시간" span={2}>
                    {order.distance ? `${order.distance} km / ${order.durationTime} 분` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="비고" span={2}>
                    {order.remark || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="최종 수정자">{order.updatedBy || '-'}</Descriptions.Item>
                  <Descriptions.Item label="수정 시간">
                    {order.updateAt ? dayjs(order.updateAt).format('YYYY-MM-DD HH:mm') : '-'}
                  </Descriptions.Item>
                </Descriptions>
                
                {postalCodeInfo && postalCodeInfo.details && (
                  <>
                    <Divider orientation="left">우편번호 정보</Divider>
                    <Descriptions bordered column={2}>
                      {postalCodeInfo.details.map(detail => (
                        <Descriptions.Item 
                          key={detail.warehouse} 
                          label={`${detail.warehouse} 창고`}
                        >
                          거리: {detail.distance} km / 소요시간: {detail.durationTime} 분
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </>
                )}
              </>
            )}
            
            <Divider />
            
            <div style={{ textAlign: 'right' }}>
              {renderStatusActions()}
            </div>
          </>
        )
      )}
    </Modal>
  );
};

export default OrderDetailModal;
