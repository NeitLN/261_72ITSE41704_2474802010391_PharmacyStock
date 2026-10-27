import {
  AlertOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import type { CSSProperties } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { canOpen } from '../auth/access';
import { useAuth } from '../auth/authContext';
import { BrandLogo } from '../ui/BrandLogo';

const { Header, Sider, Content } = Layout;

/**
 * Navigation entries map one-to-one onto the planned use case groups. Each
 * user sees only the screens their role may open (src/auth/access.ts).
 */
const allMenuItems = [
  {
    key: '/catalogue',
    icon: <MedicineBoxOutlined />,
    label: <Link to="/catalogue">Catalogue &amp; batches</Link>,
  },
  {
    key: '/suppliers',
    icon: <ShopOutlined />,
    label: <Link to="/suppliers">Suppliers &amp; receipts</Link>,
  },
  {
    key: '/dispensing',
    icon: <FileTextOutlined />,
    label: <Link to="/dispensing">Prescriptions &amp; dispensing</Link>,
  },
  {
    key: '/sales',
    icon: <ShoppingCartOutlined />,
    label: <Link to="/sales">Sales &amp; returns</Link>,
  },
  {
    key: '/reports',
    icon: <AlertOutlined />,
    label: <Link to="/reports">Stock control &amp; reports</Link>,
  },
  {
    key: '/administration',
    icon: <SettingOutlined />,
    label: <Link to="/administration">Users &amp; roles</Link>,
  },
];

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  PHARMACIST: 'Pharmacist',
  CASHIER: 'Cashier',
};

/** The role reads as who you are, not as a stock status, so it has no status colour. */
const rolePill: CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '20px',
  padding: '0 8px',
  borderRadius: 4,
  color: '#fff',
  background: 'rgba(255, 255, 255, 0.14)',
  border: '1px solid rgba(255, 255, 255, 0.35)',
};

export function MainLayout() {
  const { pathname } = useLocation();
  const { user, can, signOut } = useAuth();
  const menuItems = allMenuItems.filter((item) => canOpen(item.key, can));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Link to="/" aria-label="LotOrder, go to your start page" style={{ display: 'flex' }}>
          <BrandLogo variant="header" />
        </Link>
        {user && (
          // The header's 64 px line height would push the ellipsis text down.
          <Space size={12} align="center" style={{ lineHeight: 'normal' }}>
            <Typography.Text
              title={user.fullName}
              ellipsis
              style={{ color: '#fff', maxWidth: 220, verticalAlign: 'middle' }}
            >
              {user.fullName}
            </Typography.Text>
            <span style={rolePill}>{ROLE_LABELS[user.role] ?? user.role}</span>
            <Button ghost icon={<LogoutOutlined />} onClick={() => void signOut()}>
              Sign out
            </Button>
          </Space>
        )}
      </Header>
      <Layout>
        <Sider width={260} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
