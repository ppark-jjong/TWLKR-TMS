/**
 * 주문 생성 모달 컴포넌트
 */
import React, { useState } from 'react';
import { 
  Modal, Form, Input, Select, DatePicker, 
  Row, Col, Button, message 
} from 'antd';
import { DashboardService } from '../../services';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const OrderCreateModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // 폼 초기화
  const resetForm = () => {
    form.resetFields();
  };
  
  // 우편번호 처리 - DB 레벨에서 처리되며 프론트엔드에서는 포맷만 검증
  const handlePostalCodeSearch = () => {
    let postalCode = form.getFieldValue('postalCode');
    
    if (!postalCode) {
      message.warn('우편번호를 입력하세요');
      return;
    }
    
    // 숫자만 추출
    postalCode = postalCode.replace(/[^0-9]/g, '');
    
    // 4자리 우편번호인 경우 앞에 '0' 추가 (프로젝트 규칙에 따름)
    if (postalCode.length === 4) {
      postalCode = '0' + postalCode;
      form.setFieldsValue({ postalCode });
      message.info('4자리 우편번호를 5자리로 변환했습니다');
    }
    
    // 5자리가 아닌 경우 처리
    if (postalCode.length !== 5) {
      message.warn('5자리 우편번호를 입력하세요');
      return;
    }
    
    // 우편번호를 사용하여 주소 필드 포커스
    form.getFieldInstance('address')?.focus();
    message.success('우편번호가 설정되었습니다. 상세 주소를 입력하세요.');
  };
  
  // 주문 생성 제출
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 우편번호 처리 - 4자리인 경우 앞에 '0' 추가
      let postalCode = values.postalCode;
      if (postalCode && postalCode.length === 4) {
        postalCode = '0' + postalCode;
        values.postalCode = postalCode;
      }
      
      // 날짜 데이터 ISO 문자열로 변환
      const orderData = {
        ...values,
        eta: values.eta.toISOString()
      };
      
      const response = await DashboardService.createOrder(orderData);
      
      if (response.success) {
        message.success('주문이 생성되었습니다');
        resetForm();
        
        if (onSuccess) {
          onSuccess();
        }
        
        onCancel();
      } else {
        message.error(response.message || '주문 생성 실패');
      }
    } catch (error) {
      console.error('주문 생성 오류:', error);
      message.error('주문 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 취소 처리
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <Modal
      title="새 주문 생성"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          취소
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading}
          onClick={handleSubmit}
        >
          생성
        </Button>
      ]}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: 'DELIVERY',
          department: 'CS',
          warehouse: 'SEOUL',
          sla: '당일',
          eta: dayjs().add(1, 'day')
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="주문번호"
              name="orderNo"
              rules={[{ required: true, message: '주문번호를 입력하세요' }]}
            >
              <Input placeholder="주문번호 입력" />
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
        </Row>
        
        <Row gutter={16}>
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
              <Input placeholder="SLA 입력" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="ETA (예상 도착 시간)"
              name="eta"
              rules={[{ required: true, message: 'ETA를 선택하세요' }]}
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
              label="우편번호"
              name="postalCode"
              rules={[{ required: true, message: '우편번호를 입력하세요' }]}
              extra="5자리 우편번호를 입력하세요. 4자리 입력 시 앞에 '0'이 자동으로 추가됩니다."
            >
              <Input.Search 
                placeholder="우편번호 입력 (5자리)" 
                onSearch={handlePostalCodeSearch}
                maxLength={5}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="고객명"
              name="customer"
              rules={[{ required: true, message: '고객명을 입력하세요' }]}
            >
              <Input placeholder="고객명 입력" />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          label="주소"
          name="address"
          rules={[{ required: true, message: '주소를 입력하세요' }]}
        >
          <Input placeholder="주소 입력" />
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="연락처"
              name="contact"
            >
              <Input placeholder="연락처 입력" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="기사 이름"
              name="driverName"
            >
              <Input placeholder="기사 이름 입력" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="기사 연락처"
              name="driverContact"
            >
              <Input placeholder="기사 연락처 입력" />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          label="비고"
          name="remark"
        >
          <TextArea rows={4} placeholder="비고 입력" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default OrderCreateModal;