import { PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { type Prescriber, type PrescriberInput, prescribersApi } from '../api/prescribers';
import { useLoad } from '../api/useLoad';
import { StatusTag } from '../ui/tags';

const NO_PRESCRIBERS: Prescriber[] = [];

type Shown = 'active' | 'inactive';

/**
 * UC14 prescribers: list, search, add, edit, deactivate and activate. The
 * API lists active or inactive prescribers, not both, so the list switches
 * between the two. A deactivated prescriber keeps every prescription that
 * names it but is not offered on new ones (A5).
 */
export function PrescribersPanel() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState<Shown>('active');
  const [editing, setEditing] = useState<Prescriber | 'new' | null>(null);

  const fetchPrescribers = useCallback(
    () => prescribersApi.list({ search: search || undefined, active: shown === 'active' }),
    [search, shown],
  );
  const { data: prescribers, loading, reload } = useLoad(fetchPrescribers, NO_PRESCRIBERS);

  async function toggleActive(prescriber: Prescriber) {
    try {
      if (prescriber.isActive) await prescribersApi.deactivate(prescriber.id);
      else await prescribersApi.activate(prescriber.id);
      message.success(
        prescriber.isActive
          ? `${prescriber.fullName} deactivated.`
          : `${prescriber.fullName} activated.`,
      );
      reload();
    } catch (error) {
      message.error(toApiError(error).message);
    }
  }

  const columns: ColumnsType<Prescriber> = [
    { title: 'Licence number', dataIndex: 'licenceNumber', width: 190 },
    { title: 'Full name', dataIndex: 'fullName' },
    { title: 'Clinic', dataIndex: 'clinicName', render: (v: string | null) => v ?? '—' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 110,
      render: (active: boolean) => (
        <StatusTag kind="record" value={active ? 'active' : 'inactive'} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 190,
      render: (_, prescriber) => (
        <Space>
          <Button size="small" onClick={() => setEditing(prescriber)}>
            Edit
          </Button>
          <Popconfirm
            title={prescriber.isActive ? 'Deactivate this prescriber?' : 'Activate this prescriber?'}
            description={
              prescriber.isActive
                ? 'New prescriptions cannot name them; existing ones are kept.'
                : undefined
            }
            onConfirm={() => toggleActive(prescriber)}
          >
            <Button size="small" danger={prescriber.isActive}>
              {prescriber.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
        <Input.Search
          allowClear
          placeholder="Search name, licence or clinic"
          onSearch={(value) => setSearch(value.trim())}
          style={{ width: 280 }}
        />
        <Segmented<Shown>
          value={shown}
          onChange={setShown}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
          Add prescriber
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={prescribers}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{
          emptyText: search
            ? 'No prescriber matches the search.'
            : shown === 'active'
              ? 'No active prescribers.'
              : 'No inactive prescribers.',
        }}
        style={{ marginTop: 16 }}
      />

      <PrescriberFormModal
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        prescriber={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          message.success(`${saved.fullName} saved.`);
          setEditing(null);
          reload();
        }}
      />
    </>
  );
}

interface PrescriberFormModalProps {
  /** The prescriber to edit, 'new' to add one, or null when closed. */
  prescriber: Prescriber | 'new' | null;
  onClose: () => void;
  onSaved: (saved: Prescriber) => void;
}

/** Remounted (via `key`) each time it opens, so it starts from the prescriber's values. */
function PrescriberFormModal({ prescriber, onClose, onSaved }: PrescriberFormModalProps) {
  const [form] = Form.useForm<PrescriberInput>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = prescriber === 'new';
  const initialValues: Partial<PrescriberInput> =
    prescriber && prescriber !== 'new'
      ? {
          licenceNumber: prescriber.licenceNumber,
          fullName: prescriber.fullName,
          clinicName: prescriber.clinicName ?? '',
        }
      : {};

  async function submit(values: PrescriberInput) {
    if (!prescriber) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved =
        prescriber === 'new'
          ? await prescribersApi.create(values)
          : await prescribersApi.update(prescriber.id, values);
      onSaved(saved);
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={prescriber !== null}
      title={isNew ? 'Add prescriber' : 'Edit prescriber'}
      okText="Save"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit} requiredMark>
        <Form.Item
          name="licenceNumber"
          label="Licence number"
          extra="Stored in capitals; another prescriber cannot have the same number."
          rules={[{ required: true, whitespace: true, message: 'Licence number is required.' }]}
        >
          <Input maxLength={50} placeholder="e.g. CCHN-000101-HCM" />
        </Form.Item>
        <Form.Item
          name="fullName"
          label="Full name"
          rules={[{ required: true, whitespace: true, message: 'Full name is required.' }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="clinicName" label="Clinic">
          <Input maxLength={200} />
        </Form.Item>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}
