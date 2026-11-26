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
  Tabs,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { type Supplier, type SupplierInput, suppliersApi } from '../api/suppliers';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { GoodsReceiptsPanel } from './GoodsReceiptsPanel';
import { StatusTag } from '../ui/tags';
import { LabelledSwitch, ListToolbar } from '../ui/ListToolbar';

const NO_SUPPLIERS: Supplier[] = [];

/**
 * UC02 Manage suppliers — the reference slice for every other screen:
 * list with search, a modal form whose errors appear under each field, and
 * actions that reload the list.
 */
function SuppliersPanel() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);

  const fetchSuppliers = useCallback(
    () => suppliersApi.list({ search: search || undefined, includeInactive }),
    [search, includeInactive],
  );
  const { data: suppliers, loading, error: loadError, reload } = useLoad(fetchSuppliers, NO_SUPPLIERS);

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
      render: (active: boolean) => <StatusTag kind="record" value={active ? 'active' : 'inactive'} />,
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
            title={`${supplier.isActive ? 'Deactivate' : 'Reactivate'} ${supplier.name}?`}
            description={
              supplier.isActive
                ? 'It will no longer be offered on new goods receipts.'
                : undefined
            }
            okText={supplier.isActive ? 'Deactivate' : 'Reactivate'}
            okButtonProps={{ danger: supplier.isActive }}
            cancelText="Keep it"
            onConfirm={() => toggleActive(supplier)}
          >
            <Button size="small" aria-label={`${supplier.isActive ? 'Deactivate' : 'Activate'} ${supplier.name}`}>
              {supplier.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ListToolbar
        action={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            Add supplier
          </Button>
        }
      >
        <Input.Search
          allowClear
          placeholder="Search name or phone"
          aria-label="Search suppliers by name or phone"
          onSearch={(value) => setSearch(value.trim())}
          style={{ width: 280 }}
        />
        <LabelledSwitch>
          <Switch checked={includeInactive} onChange={setIncludeInactive} />
          Show inactive
        </LabelledSwitch>
      </ListToolbar>

      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
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
    </>
  );
}

/** UC02 suppliers and UC03 goods receipts, one tab each. */
export function SuppliersPage() {
  return (
    <Card>
      <Typography.Title level={1} style={{ marginTop: 0, fontSize: 24 }}>
        Suppliers &amp; goods receipts
      </Typography.Title>
      <Tabs
        destroyOnHidden
        items={[
          { key: 'suppliers', label: 'Suppliers', children: <SuppliersPanel /> },
          { key: 'receipts', label: 'Goods receipts', children: <GoodsReceiptsPanel /> },
        ]}
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
