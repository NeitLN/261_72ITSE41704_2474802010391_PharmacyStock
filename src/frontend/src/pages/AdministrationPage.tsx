import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useCallback, useState } from 'react';
import { showApiError } from '../api/errors';
import { useLoad } from '../api/useLoad';
import { type AuditEntry, type RoleCode, type RoleRow, type UserRow, usersApi } from '../api/users';
import { useAuth } from '../auth/authContext';

const ROLE_OPTIONS: Array<{ value: RoleCode; label: string }> = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'CASHIER', label: 'Cashier' },
];

const at = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

/** UC15 users, roles and the audit log (FR-40, FR-41). Manager only. */
export function AdministrationPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Users &amp; roles
      </Typography.Title>
      <Tabs
        destroyOnHidden
        items={[
          { key: 'users', label: 'Users', children: <UsersTab /> },
          { key: 'roles', label: 'Roles', children: <RolesTab /> },
          { key: 'audit', label: 'Audit log', children: <AuditTab /> },
        ]}
      />
    </Card>
  );
}

const NO_USERS: UserRow[] = [];

function UsersTab() {
  const fetchUsers = useCallback(() => usersApi.list(), []);
  const { data: users, loading, reload } = useLoad(fetchUsers, NO_USERS);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const columns: ColumnsType<UserRow> = [
    { title: 'Username', dataIndex: 'username' },
    { title: 'Full name', dataIndex: 'fullName' },
    { title: 'Role', width: 130, render: (_, u) => u.role.name },
    {
      title: 'Account',
      width: 110,
      render: (_, u) => (u.isActive ? <Tag color="green">Active</Tag> : <Tag color="red">Locked</Tag>),
    },
    { title: 'Last sign-in', width: 190, render: (_, u) => at(u.lastLoginAt) },
    {
      title: '',
      width: 90,
      render: (_, u) => (
        <Button size="small" onClick={() => setEditing(u)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" onClick={() => setAdding(true)}>
        New user
      </Button>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        style={{ marginTop: 16 }}
      />
      {adding && (
        <NewUserModal
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

interface NewUserForm {
  username: string;
  fullName: string;
  roleCode: RoleCode;
  password: string;
  passwordConfirm: string;
}

const passwordRules = [
  { required: true, message: 'Enter a password.' },
  { min: 8, max: 72, message: 'A password has 8 to 72 characters.' },
];

function NewUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<NewUserForm>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function submit(values: NewUserForm) {
    setSaving(true);
    setRefusal(null);
    try {
      const user = await usersApi.create(values);
      message.success(`${user.username} added as ${user.role.name}. Tell them the temporary password.`);
      onDone();
    } catch (error) {
      setRefusal(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="New user" okText="Add user" confirmLoading={saving} onOk={() => form.submit()} onCancel={onClose}>
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving} initialValues={{ roleCode: 'CASHIER' }}>
        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Enter a username.' },
            {
              pattern: /^[A-Za-z0-9._-]{3,32}$/,
              message: 'A username has 3 to 32 letters, digits, dots, dashes or underscores.',
            },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, whitespace: true, message: 'Enter the full name.' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="roleCode" label="Role" rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
        <Form.Item name="password" label="Temporary password" rules={passwordRules}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="passwordConfirm"
          label="Repeat the password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Repeat the password.' },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v === getFieldValue('password')
                  ? Promise.resolve()
                  : Promise.reject(new Error('The two passwords differ.')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
      {refusal && <Alert type="error" showIcon message={refusal} />}
    </Modal>
  );
}

interface EditUserForm {
  fullName: string;
  roleCode: RoleCode;
  isActive: boolean;
  password?: string;
  passwordConfirm?: string;
}

function EditUserModal({ user, onClose, onDone }: { user: UserRow; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp();
  const { user: me } = useAuth();
  const [form] = Form.useForm<EditUserForm>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const resetting = Form.useWatch('password', form);

  async function submit(values: EditUserForm) {
    setSaving(true);
    setRefusal(null);
    try {
      await usersApi.update(user.id, {
        fullName: values.fullName,
        roleCode: values.roleCode,
        isActive: values.isActive,
      });
      if (values.password) {
        await usersApi.resetPassword(user.id, values.password, values.passwordConfirm ?? '');
      }
      message.success(`${user.username} saved.`);
      onDone();
    } catch (error) {
      setRefusal(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Edit ${user.username}`} okText="Save" confirmLoading={saving} onOk={() => form.submit()} onCancel={onClose}>
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={saving}
        initialValues={{ fullName: user.fullName, roleCode: user.role.code, isActive: user.isActive }}
      >
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, whitespace: true, message: 'Enter the full name.' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="roleCode" label="Role">
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="isActive"
          label="Account active"
          valuePropName="checked"
          extra={me?.id === user.id ? 'This is your own account.' : 'A locked user is signed out at once.'}
        >
          <Switch checkedChildren="Active" unCheckedChildren="Locked" />
        </Form.Item>
        <Typography.Text strong>Set a new temporary password (optional)</Typography.Text>
        <Form.Item name="password" label="New password" rules={[{ min: 8, max: 72, message: 'A password has 8 to 72 characters.' }]} style={{ marginTop: 8 }}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        {resetting && (
          <Form.Item
            name="passwordConfirm"
            label="Repeat the password"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('The two passwords differ.')),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        )}
      </Form>
      {refusal && <Alert type="error" showIcon message={refusal} />}
    </Modal>
  );
}

function RolesTab() {
  const { message } = App.useApp();
  const fetchRoles = useCallback(() => usersApi.roles(), []);
  const { data, loading, reload } = useLoad(fetchRoles, null);
  // Only unsaved edits; a role without one shows what the server has.
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function save(role: RoleRow) {
    setSaving(role.code);
    setRefusal(null);
    try {
      await usersApi.setRolePermissions(role.code, permissionsOf(role));
      message.success(`${role.name} saved; it applies to its users on their next action.`);
      setEdits(({ [role.code]: _saved, ...rest }) => rest);
      reload();
    } catch (error) {
      const { response } = error as { response?: { data?: { message?: string } } };
      setRefusal(response?.data?.message ?? 'The change was not saved.');
      // Show what is stored again, not the edit that was refused.
      setEdits(({ [role.code]: _refused, ...rest }) => rest);
    } finally {
      setSaving(null);
    }
  }

  const permissionsOf = (role: RoleRow) => edits[role.code] ?? role.permissions;

  if (!data) return <Table loading={loading} />;
  const columns: ColumnsType<{ code: string; description: string }> = [
    { title: 'Permission', render: (_, p) => <><code>{p.code}</code><br /><Typography.Text type="secondary">{p.description}</Typography.Text></> },
    ...data.roles.map((role) => ({
      title: `${role.name} (${role.userCount})`,
      width: 150,
      align: 'center' as const,
      render: (_: unknown, p: { code: string }) => (
        <Checkbox
          aria-label={`${role.name}: ${p.code}`}
          checked={permissionsOf(role).includes(p.code)}
          onChange={(e) =>
            setEdits((d) => ({
              ...d,
              [role.code]: e.target.checked
                ? [...permissionsOf(role), p.code]
                : permissionsOf(role).filter((c) => c !== p.code),
            }))
          }
        />
      ),
    })),
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        What each role may do. A change applies to everyone with that role on their next action. At
        least one active user must keep <code>user.manage</code>.
      </Typography.Paragraph>
      <Table rowKey="code" size="small" columns={columns} dataSource={data.allPermissions} pagination={false} />
      <Space style={{ marginTop: 16 }}>
        {data.roles.map((role) => (
          <Button key={role.code} loading={saving === role.code} onClick={() => save(role)}>
            Save {role.name}
          </Button>
        ))}
      </Space>
      {refusal && <Alert type="error" showIcon message={refusal} style={{ marginTop: 12 }} />}
    </>
  );
}

const ACTIONS = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'user.created',
  'user.updated',
  'user.role_changed',
  'user.locked',
  'user.unlocked',
  'user.password_reset',
  'role.permissions_changed',
  'stock_take.approved',
  'price.changed',
];

function AuditTab() {
  const [period, setPeriod] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [action, setAction] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const fetchLog = useCallback(
    () =>
      usersApi.audit({
        from: period?.[0]?.format('YYYY-MM-DD'),
        to: period?.[1]?.format('YYYY-MM-DD'),
        action,
        page,
      }),
    [period, action, page],
  );
  const { data, loading } = useLoad(fetchLog, { items: [] as AuditEntry[], total: 0 });

  const columns: ColumnsType<AuditEntry> = [
    { title: 'When', width: 190, render: (_, e) => at(e.occurredAt) },
    { title: 'Who', width: 180, render: (_, e) => e.performedBy?.fullName ?? '—' },
    { title: 'Action', width: 200, render: (_, e) => <code>{e.action}</code> },
    {
      title: 'Details',
      render: (_, e) =>
        e.details === null ? '—' : typeof e.details === 'string' ? e.details : JSON.stringify(e.details),
    },
  ];

  return (
    <>
      <Space wrap>
        <DatePicker.RangePicker
          onChange={(v) => {
            setPeriod(v as [Dayjs | null, Dayjs | null] | null);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="All actions"
          style={{ width: 240 }}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={ACTIONS.map((a) => ({ value: a, label: a }))}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data.items}
        loading={loading}
        pagination={{ current: page, pageSize: 50, total: data.total, onChange: setPage, showSizeChanger: false }}
        locale={{ emptyText: 'Nothing recorded for these filters.' }}
        style={{ marginTop: 16 }}
      />
    </>
  );
}
