// src/components/DashboardSearch.js
import React, { useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Card,
  Divider,
  Typography,
  Space,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import locale from "antd/es/date-picker/locale/ko_KR";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

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
    date_range: [dayjs().subtract(7, "day"), dayjs()],
  },
  userRole = "USER",
}) => {
  const [form] = Form.useForm();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // 폼 초기화 후 검색 초기화 함수 호출
  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  // 검색 제출
  const handleSubmit = (values) => {
    onSearch(values);
  };

  // 필터 토글
  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  React.useEffect(() => {
    // 초기값 설정
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  return (
    <Card className="search-card" style={{ marginBottom: 16 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
      >
        {/* 기본 검색 영역 */}
        <Row gutter={16} align="middle">
          <Col xs={24} sm={24} md={10} lg={10}>
            <Form.Item
              name="search_term"
              label="검색어"
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder="주문번호, 고객명, 주소 검색"
                prefix={<SearchOutlined />}
                size="middle"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={24} md={8} lg={8}>
            <Form.Item
              name="date_range"
              label="날짜 범위"
              style={{ marginBottom: 0 }}
            >
              <RangePicker
                locale={locale}
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                size="middle"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={24} md={6} lg={6} style={{ textAlign: "right" }}>
            <Space>
              <Button
                type="default"
                icon={<FilterOutlined />}
                onClick={toggleAdvancedFilters}
              >
                {showAdvancedFilters ? "간단 검색" : "상세 검색"}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
              >
                검색
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 상세 필터 영역 */}
        {showAdvancedFilters && (
          <>
            <Divider style={{ margin: "16px 0 12px" }} />
            <Row gutter={16}>
              <Col span={8}>
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
              <Col span={8}>
                <Form.Item name="department" label="부서">
                  <Select placeholder="부서 선택" allowClear>
                    <Option value="CS">CS</Option>
                    <Option value="HES">HES</Option>
                    <Option value="LENOVO">LENOVO</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="warehouse" label="창고">
                  <Select placeholder="창고 선택" allowClear>
                    <Option value="SEOUL">서울</Option>
                    <Option value="BUSAN">부산</Option>
                    <Option value="GWANGJU">광주</Option>
                    <Option value="DAEJEON">대전</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24} style={{ textAlign: "right" }}>
                <Button onClick={handleReset} style={{ marginRight: 8 }}>
                  초기화
                </Button>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  * 상세 검색은 클라이언트에서 즉시 필터링됩니다
                </Text>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Card>
  );
};

export default DashboardSearch;
