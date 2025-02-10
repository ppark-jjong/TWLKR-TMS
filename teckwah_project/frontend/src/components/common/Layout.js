// src/components/common/Layout.js
import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  styled,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";

const DRAWER_WIDTH = 240;

const StyledDrawer = styled(Drawer)({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  "& .MuiDrawer-paper": {
    width: DRAWER_WIDTH,
    boxSizing: "border-box",
  },
});

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginLeft: DRAWER_WIDTH,
}));

const Logo = styled("img")({
  width: "auto",
  height: "auto",
  marginRight: 16,
});

/**
 * 메인 레이아웃 컴포넌트
 * @returns {JSX.Element} Layout 컴포넌트
 */
function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: "배송현황", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "통계", icon: <AssessmentIcon />, path: "/visualization" },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Logo src="./logo.png" alt="Logo" />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            배송 실시간 관제 시스템
          </Typography>
        </Toolbar>
      </AppBar>

      <StyledDrawer variant="permanent">
        <Toolbar />
        <Box sx={{ overflow: "auto", mt: 2 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              사용자 정보
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {user?.user_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              부서: {user?.user_department}
            </Typography>
          </Box>
          <Divider />
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            <Divider />
            <ListItem button onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="로그아웃" />
            </ListItem>
          </List>
        </Box>
      </StyledDrawer>

      <MainContent>
        <Toolbar /> {/* 상단 여백 */}
        <Outlet />
      </MainContent>
    </Box>
  );
}

export default Layout;
