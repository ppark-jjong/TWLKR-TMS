// src/components/common/Sidebar.js (사이드바에 다운로드 메뉴 추가 부분만 수정)

// 기존 import에 DownloadOutlined 추가
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
  DownloadOutlined, // 추가
} from "@ant-design/icons";

// menuItems 함수 내의 관리자 권한 메뉴 부분 수정
if (userRole === "ADMIN") {
  return [
    {
      key: "/admin",
      icon: <SettingOutlined />,
      label: (
        <Space>
          <span>관리</span>
          <Badge
            count="관리자"
            size="small"
            style={{ backgroundColor: "#f50" }}
          />
        </Space>
      ),
      onClick: () => navigate("/admin"),
    },
    {
      key: "/visualization",
      icon: <BarChartOutlined />,
      label: "통계",
      onClick: () => navigate("/visualization"),
    },
    {
      key: "/download",
      icon: <DownloadOutlined />,
      label: "다운로드",
      onClick: () => navigate("/download"),
    },
    ...baseMenuItems,
  ];
}

// 일반 사용자 메뉴 부분 수정
return [
  {
    key: "/dashboard",
    icon: <CarOutlined />,
    label: "배차",
    onClick: () => navigate("/dashboard"),
  },
  {
    key: "/visualization",
    icon: <BarChartOutlined />,
    label: "통계",
    onClick: () => navigate("/visualization"),
  },
  {
    key: "/download",
    icon: <DownloadOutlined />,
    label: "다운로드",
    onClick: () => navigate("/download"),
  },
  ...baseMenuItems,
];
