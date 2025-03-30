// src/components/DashboardSearch.js
import React from 'react';
import { Form, Input, Select, DatePicker, Button, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 대시보드 검색 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Function} props.onSearch - 검색 제출 핸들러
 * @param {Function} props.onReset - 검색 초기화 핸들러
 * @param {Object} props.initialValues - 초기 폼 값
 * @param {string} props.userRole - 사용자 권한
 */
const DashboardSearch = ({
  onSearch,
  onReset,
  initialValues = {
    date_range: [dayjs().subtract(7, 'day'), dayjs()],
  },
  userRole = 'USER',
}) => {
  const [form] = Form.useForm();

  // 폼 초기화 후 검색 초기화 함수 호출
  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  React.useEffect(() => {
    // 초기값 설정
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSearch}
      initialValues={initialValues}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item name="search_term" label="검색어">
            <Input placeholder="주문번호, 고객명, 주소" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="status" label="상태">
            <Select placeholder="상태 선택" allowClear>
              <Option value="WAITING">대기</Option>
              <Option value="IN_PROGRESS">진행</Option>
              <Option value="COMPLETE">완료</Option>
              <Option value="ISSUE">이슈</Option>
              <Option value="CANCEL">취소</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="department" label="부서">
            <Select placeholder="부서 선택" allowClear>
              <Option value="CS">CS</Option>
              <Option value="HES">HES</Option>
              <Option value="LENOVO">LENOVO</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="warehouse" label="창고">
            <Select placeholder="창고 선택" allowClear>
              <Option value="SEOUL">서울</Option>
              <Option value="BUSAN">부산</Option>
              <Option value="GWANGJU">광주</Option>
              <Option value="DAEJEON">대전</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="date_range" label="날짜 범위">
            <RangePicker locale={locale} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row>
        <Col span={24} style={{ textAlign: 'right' }}>
          <Button onClick={handleReset} style={{ marginRight: 8 }}>
            초기화
          </Button>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            검색
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default DashboardSearch;
