// src/components/common/Sidebar.js - 수정된 사이드바 메뉴
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Badge, Typography, Avatar } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  CarOutlined,
  CloudOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { FONT_STYLES } from '../../utils/Constants';

const { Sider } = Layout;
const { Text } = Typography;

/**
 * 사이드바 컴포넌트 - 관리자 기능 간소화
 * 관리자 전용 페이지 제거 및 다운로드 메뉴 관리자 전용 설정
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  // 현재 경로에 따라 선택된 메뉴 항목 업데이트
  useEffect(() => {
    const path = location.pathname;
    setSelectedKeys([path]);
  }, [location.pathname]);

  // 로고 및 제목 렌더링
  const renderLogo = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '8px 0' : '16px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      <img
        src="/static/logo.png"
        alt="로고"
        style={{
          height: collapsed ? '24px' : '32px',
          marginRight: collapsed ? '0' : '8px',
        }}
      />
      {!collapsed && (
        <Text
          style={{
            ...FONT_STYLES.TITLE.MEDIUM,
            color: '#1890ff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          배송 관제 시스템
        </Text>
      )}
    </div>
  );

  // 사용자 정보 렌더링
  const renderUserInfo = () => (
    <div
      style={{
        padding: collapsed ? '8px 4px' : '16px',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}
    >
      <Space>
        <Avatar icon={<UserOutlined />} />
        {!collapsed && (
          <div>
            <Text style={{ ...FONT_STYLES.BODY.MEDIUM, display: 'block' }}>
              {user?.user_name || '사용자'}
            </Text>
            <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
              {user?.user_department || '부서 미지정'}
            </Text>
          </div>
        )}
      </Space>
      {!collapsed && (
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={logout}
          title="로그아웃"
        />
      )}
    </div>
  );

  // 메뉴 항목 구성 - 권한에 따라 다른 메뉴 표시
  const getMenuItems = () => {
    // 기본 메뉴 항목 (모든 사용자)
    const baseMenuItems = [
      {
        key: '/dashboard',
        icon: <CarOutlined />,
        label: '배차',
        onClick: () => navigate('/dashboard'),
      },
      {
        key: '/visualization',
        icon: <BarChartOutlined />,
        label: '통계',
        onClick: () => navigate('/visualization'),
      },
    ];

    // 관리자 권한 여부에 따라 다운로드 메뉴 추가
    if (isAdmin) {
      baseMenuItems.push({
        key: '/download',
        icon: <DownloadOutlined />,
        label: '다운로드',
        onClick: () => navigate('/download'),
      });
    }

    return baseMenuItems;
  };

  return (
    <Sider
      width={220}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      style={{
        boxShadow: '2px 0 8px 0 rgba(29, 35, 41, 0.05)',
        background: '#fff',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {renderLogo()}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '12px 8px',
        }}
      >
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          size="small"
        />
      </div>

      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        items={getMenuItems()}
        style={{ borderRight: 0 }}
      />

      {renderUserInfo()}
    </Sider>
  );
};

export default Sidebar;
