import {
  AlertOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Space, Tag, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { canOpen } from '../auth/access';
import { useAuth } from '../auth/authContext';

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

export function MainLayout() {
  const { pathname } = useLocation();
  const { user, can, signOut } = useAuth();
  const menuItems = allMenuItems.filter((item) => canOpen(item.key, can));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Pharmacy Stock &amp; Prescription Dispensing
        </Typography.Title>
        {user && (
          <Space>
            <Typography.Text style={{ color: '#fff' }}>{user.fullName}</Typography.Text>
            <Tag color="cyan">{ROLE_LABELS[user.role] ?? user.role}</Tag>
            <Button icon={<LogoutOutlined />} onClick={() => void signOut()}>
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
