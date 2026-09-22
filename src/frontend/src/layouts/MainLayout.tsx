import {
  AlertOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

/** Navigation entries map one-to-one onto the planned use case groups. */
const menuItems = [
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
    label: <Link to="/reports">Alerts &amp; reports</Link>,
  },
];

export function MainLayout() {
  const { pathname } = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Pharmacy Stock &amp; Prescription Dispensing
        </Typography.Title>
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
