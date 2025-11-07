import React, { useState } from 'react';
import {
  HomeOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Menu, theme, Avatar } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';

const { Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="profile-section" style={{ padding: '24px 0', textAlign: 'center' }}>
          <Avatar size={collapsed ? 40 : 64} icon={<UserOutlined />} />
          {!collapsed && (
            <div style={{ marginTop: '16px' }}>
              <ThemeSwitcher />
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/']}
          onClick={({ key }) => navigate(key)}
          items={[
            {
              key: '/',
              icon: <HomeOutlined />,
              label: 'Home',
            },
            {
              key: '/statistics',
              icon: <BarChartOutlined />,
              label: 'Statistics',
            },
            {
              key: '/configuration',
              icon: <SettingOutlined />,
              label: 'Configuration',
            },
          ]}
        />
      </Sider>
      <Layout style={{ background: 'red' }}>
        <Content
          style={{
            padding: 0,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
