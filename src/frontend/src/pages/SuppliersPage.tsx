import { PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { type Supplier, type SupplierInput, suppliersApi } from '../api/suppliers';
import { useLoad } from '../api/useLoad';

const NO_SUPPLIERS: Supplier[] = [];

/**
 * UC02 Manage suppliers — the reference slice for every other screen:
 * list with search, a modal form whose errors appear under each field, and
 * actions that reload the list. The goods receipt tab (UC03) is added next.
 */
export function SuppliersPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);

  const fetchSuppliers = useCallback(
    () => suppliersApi.list({ search: search || undefined, includeInactive }),
    [search, includeInactive],
  );
  const { data: suppliers, loading, reload } = useLoad(fetchSuppliers, NO_SUPPLIERS);

  async function toggleActive(supplier: Supplier) {
    try {
      await suppliersApi.setActive(supplier.id, !supplier.isActive);
      message.success(
        supplier.isActive ? `${supplier.name} deactivated.` : `${supplier.name} reactivated.`,
      );
      reload();
    } catch (error) {
      message.error(toApiError(error).message);
    }
  }

  const columns: ColumnsType<Supplier> = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone', width: 160 },
    { title: 'Address', dataIndex: 'address', render: (v: string | null) => v ?? '—' },
    {
      title: 'Contact',
      dataIndex: 'contactPerson',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 110,
      render: (active: boolean) =>
        active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 190,
      render: (_, supplier) => (
        <Space>
          <Button size="small" onClick={() => setEditing(supplier)}>
            Edit
          </Button>
          <Popconfirm
            title={supplier.isActive ? 'Deactivate this supplier?' : 'Reactivate this supplier?'}
            description={
              supplier.isActive
                ? 'It will no longer be offered on new goods receipts.'
                : undefined
            }
            onConfirm={() => toggleActive(supplier)}
          >
            <Button size="small" danger={supplier.isActive}>
              {supplier.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Suppliers
        </Typography.Title>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search name or phone"
            onSearch={(value) => setSearch(value.trim())}
            style={{ width: 260 }}
          />
          <Space>
            <Switch checked={includeInactive} onChange={setIncludeInactive} />
            <span>Show inactive</span>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            Add supplier
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={suppliers}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: search ? 'No supplier matches the search.' : 'No suppliers yet.' }}
        style={{ marginTop: 16 }}
      />

      <SupplierFormModal
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        supplier={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          message.success(`${saved.name} saved.`);
          setEditing(null);
          reload();
        }}
      />
    </Card>
  );
}

interface SupplierFormModalProps {
  /** The supplier to edit, 'new' to add one, or null when closed. */
  supplier: Supplier | 'new' | null;
  onClose: () => void;
  onSaved: (saved: Supplier) => void;
}

/** Remounted (via `key`) each time it opens, so it starts from the supplier's values. */
function SupplierFormModal({ supplier, onClose, onSaved }: SupplierFormModalProps) {
  const [form] = Form.useForm<SupplierInput>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = supplier === 'new';
  const initialValues: Partial<SupplierInput> =
    supplier && supplier !== 'new'
      ? {
          name: supplier.name,
          phone: supplier.phone,
          address: supplier.address ?? '',
          contactPerson: supplier.contactPerson ?? '',
          email: supplier.email ?? '',
        }
      : {};

  async function submit(values: SupplierInput) {
    if (!supplier) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved =
        supplier === 'new'
          ? await suppliersApi.create(values)
          : await suppliersApi.update(supplier.id, values);
      onSaved(saved);
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={supplier !== null}
      title={isNew ? 'Add supplier' : 'Edit supplier'}
      okText="Save"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={submit}
        requiredMark
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, whitespace: true, message: 'Name is required.' }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone number"
          rules={[{ required: true, whitespace: true, message: 'Phone number is required.' }]}
        >
          <Input maxLength={20} placeholder="e.g. 028 3855 1234" />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input maxLength={300} />
        </Form.Item>
        <Form.Item name="contactPerson" label="Contact person">
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="email" label="E-mail">
          <Input maxLength={200} />
        </Form.Item>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}
