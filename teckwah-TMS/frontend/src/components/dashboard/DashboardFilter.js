/**
 * 대시보드 필터 컴포넌트
 */
import React from 'react';
import { Form, Row, Col, DatePicker, Select, Input, Button, Card, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DashboardFilter = ({ 
  onFilterChange, 
  initialValues,
  loading,
  statusOptions,
  departmentOptions,
  warehouseOptions
}) => {
  const [form] = Form.useForm();
  
  // 필터 적용
  const handleFinish = (values) => {
    const filters = {
      ...values,
      startDate: values.dateRange?.[0]?.startOf('day').toISOString(),
      endDate: values.dateRange?.[1]?.endOf('day').toISOString(),
    };
    
    // dateRange 필드 제거 (API에서 사용하지 않음)
    delete filters.dateRange;
    
    onFilterChange(filters);
  };
  
  // 필터 초기화
  const handleReset = () => {
    form.resetFields();
    
    // 오늘 날짜 기본값으로 설정
    const today = dayjs();
    form.setFieldsValue({
      dateRange: [today, today]
    });
    
    // 초기화된 필터로 재검색
    handleFinish(form.getFieldsValue());
  };
  
  return (
    <Card 
      bordered={false} 
      style={{ marginBottom: 24 }}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <Form
        form={form}
        layout="horizontal"
        onFinish={handleFinish}
        initialValues={{
          dateRange: initialValues?.startDate && initialValues?.endDate
            ? [dayjs(initialValues.startDate), dayjs(initialValues.endDate)]
            : [dayjs(), dayjs()],
          status: initialValues?.status,
          department: initialValues?.department,
          warehouse: initialValues?.warehouse,
          orderNo: initialValues?.orderNo
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={24} md={8}>
            <Form.Item 
              label="ETA 날짜" 
              name="dateRange"
              rules={[{ required: true, message: '날짜를 선택해주세요' }]}
            >
              <RangePicker 
                style={{ width: '100%' }} 
                format="YYYY-MM-DD"
                allowClear={false}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="상태" name="status">
              <Select allowClear placeholder="전체">
                {statusOptions?.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="부서" name="department">
              <Select allowClear placeholder="전체">
                {departmentOptions?.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="창고" name="warehouse">
              <Select allowClear placeholder="전체">
                {warehouseOptions?.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="주문번호" name="orderNo">
              <Input placeholder="주문번호 검색" allowClear />
            </Form.Item>
          </Col>
        </Row>
        
        <Row>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={handleReset} 
                icon={<ReloadOutlined />}
              >
                초기화
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SearchOutlined />}
              >
                검색
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default DashboardFilter;
