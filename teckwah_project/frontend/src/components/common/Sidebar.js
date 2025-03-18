// src/components/common/Sidebar.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Badge,
  Space,
  Tooltip,
  Divider,
} from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  CarOutlined,
  CloudOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TokenManager from '../../utils/TokenManager';
import message from '../../utils/message';
import { MessageKeys } from '../../utils/message';
import { useLogger } from '../../utils/LogUtils';
import { FONT_STYLES } from '../../utils/Constants';

const { Sider } = Layout;
const { Title, Text } = Typography;

/**
 * 사이드바 컴포넌트
 * 네비게이션 및 사용자 정보 표시, 권한 기반 메뉴 구성
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const logger = useLogger('Sidebar');

  // 사이드바 상태 관리
  const [collapsed, setCollapsed] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionInfo, setSessionInfo] = useState(null);

  // 세션 정보 로드
  useEffect(() => {
    if (user) {
      // 토큰 정보 가져오기
      const accessToken = TokenManager.getAccessToken();
      if (accessToken) {
        try {
          // JWT 페이로드 파싱 (실제 구현에서는 보안상 주의)
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const expiryTime = payload.exp * 1000; // UNIX 타임스탬프를 밀리초로 변환

          setSessionInfo({
            expiresAt: expiryTime,
            remainingTime: Math.max(0, expiryTime - Date.now()),
          });
        } catch (error) {
          logger.error('토큰 파싱 오류:', error);
        }
      }
    }
  }, [user, lastActivity, logger]);

  // 1분마다 세션 정보 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActivity(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 로그아웃 처리 핸들러
   */
  const handleLogout = async () => {
    try {
      logger.info('로그아웃 요청');
      await logout();
      message.success('로그아웃되었습니다', MessageKeys.AUTH.LOGOUT);
      navigate('/login');
    } catch (error) {
      logger.error('로그아웃 중 오류 발생:', error);
      message.error('로그아웃 중 오류가 발생했습니다', MessageKeys.AUTH.LOGOUT);
    }
  };

  /**
   * 권한별 접근 가능 메뉴 설정 (메모이제이션)
   */
  const menuItems = useMemo(() => {
    // 사용자 권한 확인
    const userRole = isAdmin ? 'ADMIN' : 'USER';
    logger.debug('메뉴 아이템 구성:', { userRole });

    // 기본 메뉴 아이템 (로그아웃은 공통)
    const baseMenuItems = [
      {
        key: 'session-info',
        icon: <ClockCircleOutlined />,
        label: (
          <Space direction="vertical" size={0} style={{ lineHeight: '1.2' }}>
            <Text style={{ fontSize: '12px', marginBottom: 0 }}>세션 정보</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {sessionInfo
                ? new Date(sessionInfo.expiresAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '정보 없음'}
            </Text>
          </Space>
        ),
        disabled: true,
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '로그아웃',
        onClick: handleLogout,
        danger: true,
      },
    ];

    // 관리자 권한인 경우 - 관리, 통계 메뉴 표시
    if (userRole === 'ADMIN') {
      return [
        {
          key: '/admin',
          icon: <SettingOutlined />,
          label: (
            <Space>
              <span>관리</span>
              <Badge
                count="관리자"
                size="small"
                style={{ backgroundColor: '#f50' }}
              />
            </Space>
          ),
          onClick: () => navigate('/admin'),
        },
        {
          key: '/visualization',
          icon: <BarChartOutlined />,
          label: '통계',
          onClick: () => navigate('/visualization'),
        },
        ...baseMenuItems,
      ];
    }

    // 일반 사용자 권한인 경우 - 배차, 통계 메뉴 표시
    return [
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
      ...baseMenuItems,
    ];
  }, [navigate, isAdmin, handleLogout, sessionInfo, logger]);

  // 세션 만료 시간 표시
  const renderSessionExpiryInfo = () => {
    if (!sessionInfo) return null;

    const remainingMinutes = Math.floor(
      (sessionInfo.expiresAt - Date.now()) / 60000
    );
    const isExpiringSoon = remainingMinutes < 10;

    return (
      <Tooltip
        title={`세션 만료: ${new Date(sessionInfo.expiresAt).toLocaleTimeString(
          'ko-KR'
        )}`}
        placement="right"
      >
        <Badge
          status={isExpiringSoon ? 'error' : 'success'}
          text={isExpiringSoon ? `${remainingMinutes}분 후 만료` : '활성 세션'}
          style={{ fontSize: '12px' }}
        />
      </Tooltip>
    );
  };

  return (
    <Sider
      width={220}
      theme="light"
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
    >
      <div
        style={{
          padding: collapsed ? '12px 8px' : '20px 16px',
          borderBottom: '1px solid #f0f0f0',
          transition: 'all 0.2s',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: collapsed ? '8px' : '16px',
          }}
        >
          <img
            src="/static/logo.png"
            alt="Logo"
            style={{
              width: collapsed ? 40 : 130,
              height: collapsed ? 40 : 58,
              marginBottom: collapsed ? 8 : 16,
              display: 'inline-block',
              transition: 'all 0.2s',
            }}
          />
        </div>

        {!collapsed && (
          <>
            <div
              style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}
            >
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: isAdmin ? '#f56a00' : '#1890ff' }}
              />
              <div style={{ marginLeft: 8 }}>
                <Title level={5} style={{ margin: 0 }}>
                  {user?.user_id}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {user?.user_department} / {isAdmin ? '관리자' : '일반 사용자'}
                </Text>
              </div>
            </div>

            <div style={{ marginTop: 8, marginBottom: 4 }}>
              {renderSessionExpiryInfo()}
            </div>
          </>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ borderRight: 0 }}
      />

      {collapsed && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Tooltip title={user?.user_id || '사용자'} placement="right">
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: isAdmin ? '#f56a00' : '#1890ff' }}
            />
          </Tooltip>
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;
