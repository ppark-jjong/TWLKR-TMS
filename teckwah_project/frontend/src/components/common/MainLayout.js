// frontend/src/components/common/MainLayout.js
import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';

const { Content } = Layout;

const MainLayout = ({ children }) => {
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', backgroundColor: 'white' }}>
      <Sidebar />
      <Layout style={{ backgroundColor: 'white' }}>
        <Content style={{ height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;