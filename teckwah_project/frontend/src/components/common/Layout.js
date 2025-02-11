// frontend/src/components/common/Layout.js

import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  appBar: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    backgroundColor: theme.palette.primary.main
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
    backgroundColor: theme.palette.background.paper
  },
  toolbar: theme.mixins.toolbar,
  logo: {
    padding: theme.spacing(2),
    textAlign: 'center',
    '& img': {
      width: 150,
      height: 'auto'
    }
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh'
  },
  userInfo: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[100]
  },
  menuItem: {
    '&:hover': {
      backgroundColor: theme.palette.action.hover
    }
  },
  activeMenuItem: {
    backgroundColor: theme.palette.action.selected
  }
}));

const Layout = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('로그아웃 시도...');
      await logout();
      console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const menuItems = [
    { text: '배송현황', icon: <DashboardIcon />, path: '/dashboard' },
    { text: '시각화', icon: <TimelineIcon />, path: '/visualization' }
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
          <Typography variant="subtitle1">{user?.user_id}</Typography>
          <Typography variant="body2" color="textSecondary">
            {user?.user_department}
          </Typography>
        </div>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
              className={classes.menuItem}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem button onClick={handleLogout} className={classes.menuItem}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="로그아웃" />
          </ListItem>
        </List>
      </Drawer>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;