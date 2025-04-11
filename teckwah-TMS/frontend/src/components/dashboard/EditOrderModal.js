import React, { useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Row, 
  Col,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { 
  TYPE_OPTIONS, 
  DEPARTMENT_OPTIONS, 
  WAREHOUSE_OPTIONS,
  SLA_OPTIONS,
  STATUS_OPTIONS
} from '../../utils/constants';
import { isAdmin } from '../../utils/auth';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

/**
 * 주문 수정 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSubmit - 폼 제출 콜백
 * @param {Object} props.orderData - 주문 데이터
 * @param {boolean} props.loading - 로딩 상태
 */
const EditOrderModal = ({ visible, onClose, onSubmit, orderData, loading }) => {
  const [form] = Form.useForm();
  
  // 주문 데이터가 변경되면 폼 필드 값 설정
  useEffect(() => {
    if (orderData && visible) {
      // 날짜 필드는 moment 객체로 변환
      const formData = {
        ...orderData,
        eta: orderData.eta ? dayjs(orderData.eta) : null,
      };
      
      form.setFieldsValue(formData);
    }
  }, [form, orderData, visible]);
  
  // 폼 제출 핸들러
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        // 날짜 필드 처리
        const formattedValues = {
          ...values,
          update_at: new Date().toISOString()
        };
        
        onSubmit(formattedValues);
      })
      .catch(error => {
        console.error('Validation failed:', error);
      });
  };
  
  // 모달이 닫힐 때 폼 초기화
  const handleCancel = () => {
    onClose();
  };
  
  // 관리자 여부 확인
  const admin = isAdmin();
  
  return (
    <Modal
      title="주문 정보 수정"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
    >
      {orderData && (
        <Form 
          form={form}
          layout="vertical"
        >
          <Form.Item name="dashboard_id" hidden>
            <Input />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="order_no"
                label="주문번호"
              >
                <Input 
                  placeholder="주문번호" 
                  disabled 
                  style={{ color: '#000' }}
                />
                <Text type="secondary">주문번호는 변경할 수 없습니다</Text>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="유형"
                rules={[{ required: true, message: '유형을 선택해주세요' }]}
              >
                <Select placeholder="유형 선택">
                  {TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department"
                label="부서"
                rules={[{ required: true, message: '부서를 선택해주세요' }]}
              >
                <Select 
                  placeholder="부서 선택"
                  disabled={!admin} // 관리자만 부서 변경 가능
                >
                  {DEPARTMENT_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warehouse"
                label="창고"
                rules={[{ required: true, message: '창고를 선택해주세요' }]}
              >
                <Select placeholder="창고 선택">
                  {WAREHOUSE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sla"
                label="SLA"
                rules={[{ required: true, message: 'SLA를 선택해주세요' }]}
              >
                <Select placeholder="SLA 선택">
                  {SLA_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="eta"
                label="ETA (예상 도착 시간)"
                rules={[{ required: true, message: 'ETA를 입력해주세요' }]}
              >
                <DatePicker 
                  showTime 
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder="ETA 선택"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="postal_code"
                label="우편번호"
                rules={[
                  { required: true, message: '우편번호를 입력해주세요' },
                  { pattern: /^\d{5}$/, message: '5자리 숫자로 입력해주세요' }
                ]}
              >
                <Input placeholder="우편번호 (5자리)" maxLength={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customer"
                label="고객명"
                rules={[{ required: true, message: '고객명을 입력해주세요' }]}
              >
                <Input placeholder="고객명" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="address"
            label="주소"
            rules={[{ required: true, message: '주소를 입력해주세요' }]}
          >
            <Input placeholder="상세 주소" maxLength={200} />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="연락처"
                rules={[
                  { 
                    pattern: /^[0-9-]+$/, 
                    message: '올바른 연락처 형식을 입력해주세요' 
                  }
                ]}
              >
                <Input placeholder="연락처 (예: 010-1234-5678)" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="상태"
                rules={[{ required: true, message: '상태를 선택해주세요' }]}
              >
                <Select placeholder="상태 선택">
                  {STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="driver_name"
                label="배송기사"
              >
                <Input placeholder="배송기사 이름" maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="driver_contact"
                label="기사 연락처"
                rules={[
                  { 
                    pattern: /^[0-9-]+$/, 
                    message: '올바른 연락처 형식을 입력해주세요' 
                  }
                ]}
              >
                <Input placeholder="기사 연락처 (예: 010-1234-5678)" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="remark"
            label="메모"
          >
            <TextArea 
              placeholder="추가 메모 사항을 입력해주세요" 
              rows={4}
              maxLength={500}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default EditOrderModal;
