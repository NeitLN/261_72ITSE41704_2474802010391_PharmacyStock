import { PlusOutlined } from '@ant-design/icons';
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
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useCallback, useState } from 'react';
import { showApiError } from '../api/errors';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { type AuditEntry, type RoleCode, type RoleRow, type UserRow, usersApi } from '../api/users';
import { useAuth } from '../auth/authContext';
import { formatDateTime, formatVnd } from '../ui/format';
import { StatusTag } from '../ui/tags';
import { ListToolbar } from '../ui/ListToolbar';

const ROLE_OPTIONS: Array<{ value: RoleCode; label: string }> = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'CASHIER', label: 'Cashier' },
];

/** UC15 users, roles and the audit log (FR-40, FR-41). Manager only. */
export function AdministrationPage() {
  return (
    <Card>
      <Typography.Title level={1} style={{ marginTop: 0, fontSize: 24 }}>
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
  const { data: users, loading, error: loadError, reload } = useLoad(fetchUsers, NO_USERS);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const columns: ColumnsType<UserRow> = [
    { title: 'Username', dataIndex: 'username' },
    { title: 'Full name', dataIndex: 'fullName' },
    { title: 'Role', width: 130, render: (_, u) => u.role.name },
    {
      title: 'Account',
      width: 110,
      render: (_, u) => <StatusTag kind="user" value={u.isActive ? 'active' : 'locked'} />,
    },
    { title: 'Last sign-in', width: 190, render: (_, u) => formatDateTime(u.lastLoginAt) },
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
      <ListToolbar
        action={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            New user
          </Button>
        }
      />
      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        style={{ marginTop: 16 }}
        locale={{ emptyText: 'No user yet.' }}
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
      {refusal && <Alert type="error" showIcon title={refusal} />}
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
    } catch (error) {
      setRefusal(showApiError(form, error));
      setSaving(false);
      return;
    }
    if (values.password) {
      try {
        await usersApi.resetPassword(user.id, values.password, values.passwordConfirm ?? '');
      } catch (error) {
        // Two calls: say which part was saved, so nobody retypes the rest.
        const reason = showApiError(form, error);
        setRefusal(
          `The name, role and account state are saved. The password was not changed${reason ? `: ${reason}` : '.'}`,
        );
        setSaving(false);
        return;
      }
    }
    try {
      message.success(`${user.username} saved.`);
      onDone();
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
      {refusal && <Alert type="error" showIcon title={refusal} />}
    </Modal>
  );
}

function RolesTab() {
  const { message } = App.useApp();
  const fetchRoles = useCallback(() => usersApi.roles(), []);
  const { data, loading, error: rolesError, reload } = useLoad(fetchRoles, null);
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

  if (!data) {
    return (
      <>
        {rolesError && <LoadFailed error={rolesError} onRetry={reload} />}
        <Table loading={loading} locale={{ emptyText: 'No permission to show.' }} />
      </>
    );
  }
  const columns: ColumnsType<{ code: string; description: string }> = [
    {
      title: 'Permission',
      // What it allows, in words first; the code is for the team that reads the logs.
      render: (_, p) => (
        <>
          {plainDescription(p.description)}
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {p.code}
          </Typography.Text>
        </>
      ),
    },
    ...data.roles.map((role) => ({
      // The save button sits on the role's own column, so a tick is never left unsaved by accident.
      title: (
        <Space orientation="vertical" size={4} style={{ alignItems: 'center' }}>
          <span>
            {role.name} ({role.userCount})
          </span>
          {edits[role.code] ? (
            <Button size="small" type="primary" loading={saving === role.code} onClick={() => save(role)}>
              Save {role.name}
            </Button>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Saved
            </Typography.Text>
          )}
        </Space>
      ),
      width: 160,
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
        Tick what each role may do, then press Save on that role. A change applies to everyone with
        that role on their next action. At least one active user must keep the right to manage
        users.
      </Typography.Paragraph>
      {Object.keys(edits).length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Unsaved changes for ${data.roles
            .filter((r) => edits[r.code])
            .map((r) => r.name)
            .join(', ')}. Press Save on the role's column.`}
        />
      )}
      <Table
        rowKey="code"
        size="small"
        columns={columns}
        dataSource={data.allPermissions}
        pagination={false}
        sticky
        locale={{ emptyText: 'No permission to show.' }}
      />
      {refusal && <Alert type="error" showIcon title={refusal} style={{ marginTop: 12 }} />}
    </>
  );
}

/** Each audit action in words, in the order the filter lists them. */
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Sign-in failed',
  'auth.logout': 'Signed out',
  'user.created': 'User created',
  'user.updated': 'User changed',
  'user.role_changed': 'Role changed',
  'user.locked': 'Account locked',
  'user.unlocked': 'Account unlocked',
  'user.password_reset': 'Password reset',
  'role.permissions_changed': 'Role permissions changed',
  'stock_take.approved': 'Stock take approved',
  'price.changed': 'Price changed',
  'sale.cart_cancelled': 'Cart cancelled',
  'dispense.cancelled': 'Hand-over cancelled',
};
const ACTIONS = Object.keys(ACTION_LABELS);

/** "Dispense against a prescription (UC06)" → "Dispense against a prescription". */
function plainDescription(description: string): string {
  return description.replace(/\s*\((?:UC|FR|BR|DEC)[^)]*\)\s*$/, '');
}

const money = (v: unknown) => (v === undefined || v === null ? '—' : formatVnd(String(v)));

/** An audit entry's details as a sentence or as "name value" pairs, never raw JSON. */
function describeDetails(action: string, raw: unknown): string {
  if (raw === null || raw === undefined) return '—';
  let d: unknown = raw;
  if (typeof raw === 'string') {
    try {
      d = JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (typeof d !== 'object' || d === null) return String(d);
  const o = d as Record<string, unknown>;
  if (action === 'price.changed') {
    if (o.kind === 'scheduled') return `Scheduled ${money(o.to)} from ${String(o.effectiveFrom)}`;
    if (o.kind === 'cancelled') return `Cancelled ${money(o.from)} that would start ${String(o.effectiveFrom)}`;
    return `${o.code ? `${String(o.code)}: ` : ''}${money(o.from)} → ${money(o.to)} from ${String(o.effectiveFrom)}`;
  }
  if (action === 'sale.cart_cancelled') {
    const lines = Array.isArray(o.lines) ? o.lines.length : 0;
    return `Reason: ${String(o.reason)} · ${lines} ${lines === 1 ? 'line' : 'lines'}`;
  }
  return Object.entries(o)
    .map(([k, v]) => {
      const name = k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
      const value = Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
      return `${name}: ${value}`;
    })
    .join(' · ');
}

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
  const { data, loading, error: loadError } = useLoad(fetchLog, { items: [] as AuditEntry[], total: 0 });

  const columns: ColumnsType<AuditEntry> = [
    { title: 'When', width: 150, className: 'nowrap', render: (_, e) => formatDateTime(e.occurredAt) },
    { title: 'Who', width: 180, render: (_, e) => e.performedBy?.fullName ?? '—' },
    { title: 'Action', width: 200, render: (_, e) => ACTION_LABELS[e.action] ?? e.action },
    { title: 'Details', render: (_, e) => describeDetails(e.action, e.details) },
  ];

  return (
    <>
      <Space wrap>
        <DatePicker.RangePicker
          format="YYYY-MM-DD"
          aria-label="Period"
          onChange={(v) => {
            setPeriod(v as [Dayjs | null, Dayjs | null] | null);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="All actions"
          aria-label="Action"
          style={{ width: 240 }}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a] }))}
        />
      </Space>
      {loadError && <LoadFailed error={loadError} />}
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
