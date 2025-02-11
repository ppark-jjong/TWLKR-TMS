// frontend/src/components/common/Layout.js

/**
 * 애플리케이션의 기본 레이아웃 컴포넌트
 * 사이드바와 메인 콘텐츠 영역을 포함
 * @module Layout
 */

import React from 'react';
import {
  makeStyles,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@material-ui/core';
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  ExitToApp as LogoutIcon
} from '@material-ui/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  appBar: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  toolbar: theme.mixins.toolbar,
  logo: {
    padding: theme.spacing(2),
    textAlign: 'center',
    '& img': {
      width: 150,
    },
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  userInfo: {
    padding: theme.spacing(2),
  },
}));

const Layout = ({ children }) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const menuItems = [
    { text: '배송현황', icon: <DashboardIcon />, path: '/dashboard' },
    { text: '시각화', icon: <TimelineIcon />, path: '/visualization' },
  ];

  return (
    <div className={classes.root}>
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <Typography variant="h6" noWrap>
            배송 실시간 관제 시스템
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        className={classes.drawer}
        variant="permanent"
        classes={{
          paper: classes.drawerPaper,
        }}
        anchor="left"
      >
        <div className={classes.logo}>
          <img src="/logo.png" alt="Logo" />
        </div>
        <Divider />
        <div className={classes.userInfo}>
          <Typography variant="subtitle1">{user.user_id}</Typography>
          <Typography variant="body2">{user.user_department}</Typography>
        </div>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="로그아웃" />
          </ListItem>
        </List>
      </Drawer>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        {children}
      </main>
    </div>
  );
};

export default Layout;