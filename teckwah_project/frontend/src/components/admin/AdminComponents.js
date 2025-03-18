// src/components/admin/AdminComponents.js
import React, { lazy } from 'react';
import { Card, Tabs, Typography, Space } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { FONT_STYLES } from '../../utils/Constants';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

/**
 * 관리자 대시보드 페이지용 컴포넌트 모음
 * 사용자 관리, 시스템 설정, 데이터 관리 등의 컴포넌트를 내보냅니다.
 * 이 파일은 AdminPage에서 사용되는 여러 관리자 전용 컴포넌트들을 모아둔 파일입니다.
 *
 * 성능 최적화를 위해 코드 스플리팅 기법을 사용하여 필요할 때만 로드됩니다.
 */

// 사용자 관리 컴포넌트 (향후 구현 예정)
export const UserManagement = () => {
  return (
    <Card title="사용자 관리" bordered={false} style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
          사용자 관리
        </Title>
        <Text style={FONT_STYLES.BODY.MEDIUM}>
          이 컴포넌트는 사용자 관리 기능을 제공합니다. 사용자 추가, 권한 변경,
          비활성화 등의 기능이 구현될 예정입니다.
        </Text>
      </Space>
    </Card>
  );
};

// 시스템 설정 컴포넌트 (향후 구현 예정)
export const SystemSettings = () => {
  return (
    <Card title="시스템 설정" bordered={false} style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
          시스템 설정
        </Title>
        <Text style={FONT_STYLES.BODY.MEDIUM}>
          이 컴포넌트는 시스템 설정 기능을 제공합니다. 알림 설정, 백업 관리,
          로그 설정 등의 기능이 구현될 예정입니다.
        </Text>
      </Space>
    </Card>
  );
};

// 데이터 관리 컴포넌트 (향후 구현 예정)
export const DataManagement = () => {
  return (
    <Card title="데이터 관리" bordered={false} style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
          데이터 관리
        </Title>
        <Text style={FONT_STYLES.BODY.MEDIUM}>
          이 컴포넌트는 데이터 관리 기능을 제공합니다. 데이터 백업, 복원, 정리
          등의 기능이 구현될 예정입니다.
        </Text>
      </Space>
    </Card>
  );
};

/**
 * 통합 관리자 컴포넌트
 * 각 관리 기능을 탭으로 구분하여 제공합니다.
 */
const AdminComponents = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title
        level={4}
        style={{ ...FONT_STYLES.TITLE.MEDIUM, marginBottom: '24px' }}
      >
        관리자 대시보드
      </Title>

      <Tabs defaultActiveKey="users">
        <TabPane
          tab={
            <span>
              <UserOutlined />
              사용자 관리
            </span>
          }
          key="users"
        >
          <UserManagement />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              시스템 설정
            </span>
          }
          key="settings"
        >
          <SystemSettings />
        </TabPane>

        <TabPane
          tab={
            <span>
              <DatabaseOutlined />
              데이터 관리
            </span>
          }
          key="data"
        >
          <DataManagement />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AdminComponents;
