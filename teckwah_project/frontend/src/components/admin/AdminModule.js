// src/components/admin/AdminModule.js
import React, { useEffect } from 'react';
import { Layout, Tabs, Typography, Button, message } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { FONT_STYLES } from '../../utils/Constants';
import { useAuth } from '../../contexts/AuthContext';
import { useLogger } from '../../utils/LogUtils';
import UserManagementTab from './UserManagementTab';
import SystemSettingsTab from './SystemSettingsTab';
import DataManagementTab from './DataManagementTab';
import useAdminData from '../../hooks/useAdminData';

const { Title } = Typography;
const { TabPane } = Tabs;

/**
 * 관리자 대시보드 모듈 컴포넌트
 * 사용자 관리, 시스템 설정, 데이터 관리 기능 제공
 */
const AdminModule = () => {
  const logger = useLogger('AdminModule');
  const { user } = useAuth();

  // useAdminData 커스텀 훅 활용
  const {
    activeTab,
    userList,
    systemSettings,
    dataStats,
    loading,
    dataRange,
    showUserModal,
    editingUser,
    handleTabChange,
    handleRefresh,
    loadData,
    setShowUserModal,
    handleUserSave,
    handleUserDelete,
    handleSettingsSave,
    handleDataExport,
    handleDataCleanup,
    handleDateRangeChange,
    userForm,
  } = useAdminData();

  // 초기 데이터 로드
  useEffect(() => {
    // 관리자 권한 검증
    if (!user || user.user_role !== 'ADMIN') {
      logger.warn('관리자 권한이 없는 사용자 접근:', user?.user_id);
      message.error('관리자 권한이 필요합니다');
      return;
    }

    logger.info('관리자 컴포넌트 초기화:', user?.user_id);
    loadData();

    // 컴포넌트 언마운트 시 정리
    return () => {
      logger.info('관리자 컴포넌트 언마운트');
    };
  }, [user, loadData, logger]);

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <Title level={4} style={FONT_STYLES.TITLE.MEDIUM}>
          관리자 대시보드
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          새로고침
        </Button>
      </div>

      <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
        <TabPane
          tab={
            <span>
              <UserOutlined />
              사용자 관리
            </span>
          }
          key="users"
        >
          <UserManagementTab
            userList={userList}
            loading={loading}
            onUserSave={handleUserSave}
            onUserDelete={handleUserDelete}
            showUserModal={showUserModal}
            setShowUserModal={setShowUserModal}
            editingUser={editingUser}
            userForm={userForm}
          />
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
          <SystemSettingsTab
            systemSettings={systemSettings}
            loading={loading}
            onSettingsSave={handleSettingsSave}
          />
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
          <DataManagementTab
            dataStats={dataStats}
            loading={loading}
            dataRange={dataRange}
            onDateRangeChange={handleDateRangeChange}
            onDataExport={handleDataExport}
            onDataCleanup={handleDataCleanup}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AdminModule;
