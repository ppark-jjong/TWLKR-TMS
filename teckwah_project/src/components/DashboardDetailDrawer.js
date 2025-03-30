// src/components/DashboardDetailDrawer.js
import React from 'react';
import { Drawer, Form, Input, Select, DatePicker, Row, Col } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;

/**
 * 대시보드 상세 정보 드로어 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 드로어 표시 여부
 * @param {Function} props.onClose - 닫기 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {Object} props.dashboard - 대시보드 데이터
 */
const DashboardDetailDrawer = ({ visible, onClose, form, dashboard }) => {
  return (
    <Drawer title="상세 정보" width={600} onClose={onClose} open={visible}>
      {dashboard && (
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="주문번호" name="order_no">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="유형" name="type">
                <Select disabled>
                  <Option value="DELIVERY">배송</Option>
                  <Option value="RETURN">회수</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="상태" name="status">
                <Select disabled>
                  <Option value="WAITING">대기</Option>
                  <Option value="IN_PROGRESS">진행</Option>
                  <Option value="COMPLETE">완료</Option>
                  <Option value="ISSUE">이슈</Option>
                  <Option value="CANCEL">취소</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="부서" name="department">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="창고" name="warehouse">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SLA" name="sla">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ETA" name="eta">
                <DatePicker showTime disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="생성시간" name="create_time">
                <DatePicker showTime disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="출발시간" name="depart_time">
                <DatePicker showTime disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="완료시간" name="complete_time">
                <DatePicker showTime disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="우편번호" name="postal_code">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="지역" name="region">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="주소" name="address">
            <Input.TextArea disabled rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="고객명" name="customer">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="연락처" name="contact">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="기사명" name="driver_name">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="기사 연락처" name="driver_contact">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="메모" name="remark">
            <Input.TextArea disabled rows={4} />
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
};

export default DashboardDetailDrawer;
