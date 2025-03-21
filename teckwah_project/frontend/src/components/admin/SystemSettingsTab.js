// src/components/admin/SystemSettingsTab.js
import React, { useState, useEffect, memo } from 'react';
import { Card, Form, Input, Select, Button, Space, Divider } from 'antd';
import { FONT_STYLES } from '../../utils/Constants';

const { Option } = Select;

/**
 * 시스템 설정 탭 컴포넌트
 * 시스템 설정 값 관리 및 수정 기능 제공
 */
const SystemSettingsTab = ({ systemSettings, loading, onSettingsSave }) => {
  const [form] = Form.useForm();

  // 시스템 설정 값으로 폼 초기화
  useEffect(() => {
    form.setFieldsValue(systemSettings);
  }, [systemSettings, form]);

  return (
    <Card title="시스템 설정">
      <Form
        form={form}
        layout="vertical"
        onFinish={onSettingsSave}
        initialValues={systemSettings}
      >
        <Form.Item
          name="api_timeout"
          label="API 타임아웃 (ms)"
          rules={[
            { required: true, message: '필수 항목입니다' },
            {
              type: 'number',
              min: 1000,
              max: 60000,
              message: '1,000~60,000 사이 값을 입력하세요',
            },
          ]}
        >
          <Input
            type="number"
            min={1000}
            max={60000}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>

        <Form.Item
          name="refresh_interval"
          label="자동 새로고침 간격 (ms)"
          rules={[
            { required: true, message: '필수 항목입니다' },
            {
              type: 'number',
              min: 10000,
              max: 300000,
              message: '10,000~300,000 사이 값을 입력하세요',
            },
          ]}
        >
          <Input
            type="number"
            min={10000}
            max={300000}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>

        <Form.Item
          name="default_date_range"
          label="기본 날짜 범위 (일)"
          rules={[
            { required: true, message: '필수 항목입니다' },
            {
              type: 'number',
              min: 1,
              max: 90,
              message: '1~90 사이 값을 입력하세요',
            },
          ]}
        >
          <Input
            type="number"
            min={1}
            max={90}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>

        <Form.Item
          name="lock_mechanism"
          label="락 메커니즘"
          rules={[{ required: true, message: '필수 항목입니다' }]}
        >
          <Select style={FONT_STYLES.BODY.MEDIUM}>
            <Option value="pessimistic">비관적 락 (동시 편집 방지)</Option>
            <Option value="optimistic">낙관적 락 (충돌 감지)</Option>
            <Option value="hybrid">하이브리드 (상황에 따라 자동 선택)</Option>
          </Select>
        </Form.Item>

        <Form.Item name="allow_concurrent_edits" label="동시 편집 허용">
          <Select style={FONT_STYLES.BODY.MEDIUM}>
            <Option value={false}>아니오 (배타적 락 사용)</Option>
            <Option value={true}>예 (버전 관리 사용)</Option>
          </Select>
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              설정 저장
            </Button>
            <Button onClick={() => form.resetFields()}>초기화</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

// 성능 최적화를 위한 메모이제이션
export default memo(SystemSettingsTab);
