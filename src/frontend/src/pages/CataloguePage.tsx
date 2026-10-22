import { PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { useMe } from '../api/me';
import {
  type Classification,
  formatVnd,
  type Medicine,
  type MedicineInput,
  medicinesApi,
  type Reference,
} from '../api/medicines';
import { useLoad } from '../api/useLoad';
import { wholeNumber } from '../forms/numberRules';
import { StockPanel } from './StockPanel';

const NO_MEDICINES: Medicine[] = [];
const NO_REFERENCE = { categories: [] as Reference[], units: [] as Reference[] };

const CLASSIFICATION_TAGS: Record<Classification, { color: string; label: string }> = {
  otc: { color: 'green', label: 'OTC' },
  prescription: { color: 'blue', label: 'Prescription' },
  controlled: { color: 'red', label: 'Controlled' },
};

/** UC01 catalogue and UC04 stock lookup, one tab each. */
export function CataloguePage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Catalogue &amp; batches
      </Typography.Title>
      <Tabs
        destroyOnHidden
        items={[
          { key: 'medicines', label: 'Medicines', children: <MedicinesPanel /> },
          { key: 'stock', label: 'Stock', children: <StockPanel /> },
        ]}
      />
    </Card>
  );
}

/** UC01 Manage medicine catalogue (FR-01 to FR-03). */
function MedicinesPanel() {
  const { message } = App.useApp();
  const { can } = useMe();
  const canManage = can('catalogue.manage');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<Medicine | 'new' | null>(null);

  const fetchReference = useCallback(() => medicinesApi.referenceData(), []);
  const { data: reference } = useLoad(fetchReference, NO_REFERENCE);

  const fetchMedicines = useCallback(
    () => medicinesApi.list({ search: search || undefined, categoryId, includeInactive }),
    [search, categoryId, includeInactive],
  );
  const { data: medicines, loading, reload } = useLoad(fetchMedicines, NO_MEDICINES);

  async function toggleActive(medicine: Medicine) {
    try {
      await medicinesApi.setActive(medicine.id, !medicine.isActive);
      message.success(
        medicine.isActive ? `${medicine.name} deactivated.` : `${medicine.name} reactivated.`,
      );
      reload();
    } catch (error) {
      message.error(toApiError(error).message);
    }
  }

  const columns: ColumnsType<Medicine> = [
    { title: 'Code', dataIndex: 'code', width: 120 },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (_, m) => (
        <Space direction="vertical" size={0}>
          <span>{m.name}</span>
          {m.activeIngredient && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {m.activeIngredient}
              {m.strength ? ` · ${m.strength}` : ''}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    { title: 'Category', render: (_, m) => m.category.name },
    {
      title: 'Classification',
      dataIndex: 'classification',
      width: 130,
      render: (c: Classification) => (
        <Tag color={CLASSIFICATION_TAGS[c].color}>{CLASSIFICATION_TAGS[c].label}</Tag>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'currentPrice',
      align: 'right',
      width: 130,
      render: (price: string | null, m) => (
        <span>
          {formatVnd(price)}
          <Typography.Text type="secondary"> /{m.baseUnit.name.toLowerCase()}</Typography.Text>
        </span>
      ),
    },
    {
      title: 'Reorder level',
      width: 130,
      render: (_, m) =>
        m.lowStockMonitored ? m.reorderLevel : <Tag>Not monitored</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 100,
      render: (active: boolean) =>
        active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
  ];

  if (canManage) {
    columns.push({
      title: '',
      key: 'actions',
      width: 190,
      render: (_, medicine) => (
        <Space>
          <Button size="small" onClick={() => setEditing(medicine)}>
            Edit
          </Button>
          <Popconfirm
            title={medicine.isActive ? 'Deactivate this medicine?' : 'Reactivate this medicine?'}
            description={
              medicine.isActive
                ? 'It can no longer be received, dispensed or sold. Its history stays.'
                : undefined
            }
            onConfirm={() => toggleActive(medicine)}
          >
            <Button size="small" danger={medicine.isActive}>
              {medicine.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    });
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Code, name or ingredient"
            onSearch={(value) => setSearch(value.trim())}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="All categories"
            value={categoryId}
            onChange={setCategoryId}
            options={reference.categories.map((c) => ({ value: c.id, label: c.name }))}
            style={{ width: 220 }}
          />
          <Space>
            <Switch checked={includeInactive} onChange={setIncludeInactive} />
            <span>Show inactive</span>
          </Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
              Add medicine
            </Button>
          )}
        </Space>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={medicines}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: search ? 'No medicine matches the search.' : 'No medicines yet.' }}
        style={{ marginTop: 16 }}
      />

      <MedicineFormModal
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        medicine={editing}
        reference={reference}
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

interface MedicineFormModalProps {
  medicine: Medicine | 'new' | null;
  reference: { categories: Reference[]; units: Reference[] };
  onClose: () => void;
  onSaved: (saved: Medicine) => void;
}

type FormValues = Omit<MedicineInput, 'currentPrice'> & { currentPrice: number };

/** Remounted (via `key`) each time it opens, so it starts from the medicine's values. */
function MedicineFormModal({ medicine, reference, onClose, onSaved }: MedicineFormModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const classification = Form.useWatch('classification', form);
  const existing = medicine && medicine !== 'new' ? medicine : null;

  const initialValues: Partial<FormValues> = existing
    ? {
        code: existing.code,
        name: existing.name,
        activeIngredient: existing.activeIngredient ?? '',
        strength: existing.strength ?? '',
        categoryId: existing.category.id,
        baseUnitId: existing.baseUnit.id,
        classification: existing.classification,
        classificationSource: existing.classificationSource ?? '',
        classificationDate: existing.classificationDate ?? '',
        reorderLevel: existing.reorderLevel,
        lowStockMonitored: existing.lowStockMonitored,
        expiryAlertDays: existing.expiryAlertDays,
        currentPrice: existing.currentPrice === null ? undefined : Number(existing.currentPrice),
      }
    : {
        classification: 'prescription',
        reorderLevel: 0,
        lowStockMonitored: true,
        expiryAlertDays: 90,
      };

  async function submit(values: FormValues) {
    setSaving(true);
    setFormError(null);
    try {
      let saved: Medicine;
      if (existing) {
        const { currentPrice, ...rest } = values;
        // Send the price only when it changed, so an edit does not add a price row.
        const priceChanged =
          existing.currentPrice === null || Number(existing.currentPrice) !== currentPrice;
        saved = await medicinesApi.update(
          existing.id,
          priceChanged ? { ...rest, currentPrice } : rest,
        );
      } else {
        saved = await medicinesApi.create(values);
      }
      onSaved(saved);
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={medicine !== null}
      title={existing ? `Edit ${existing.code}` : 'Add medicine'}
      okText="Save"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={640}
      forceRender
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit}>
        <Space style={{ width: '100%' }} align="start">
          <Form.Item
            name="code"
            label="Code"
            rules={[{ required: true, whitespace: true, message: 'Code is required.' }]}
          >
            <Input maxLength={30} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, whitespace: true, message: 'Name is required.' }]}
            style={{ flex: 1 }}
          >
            <Input maxLength={200} style={{ width: 400 }} />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} align="start">
          <Form.Item name="activeIngredient" label="Active ingredient">
            <Input maxLength={200} style={{ width: 300 }} />
          </Form.Item>
          <Form.Item name="strength" label="Strength">
            <Input maxLength={100} placeholder="e.g. 500 mg" style={{ width: 260 }} />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} align="start">
          <Form.Item
            name="categoryId"
            label="Category"
            rules={[{ required: true, message: 'Choose a category.' }]}
          >
            <Select
              style={{ width: 300 }}
              options={reference.categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            name="baseUnitId"
            label="Base unit"
            rules={[{ required: true, message: 'Choose a base unit.' }]}
          >
            <Select
              style={{ width: 260 }}
              options={reference.units.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
        </Space>
        <Form.Item
          name="classification"
          label="Classification"
          extra="Set OTC only from the registration information or the label, and record where it came from."
        >
          <Radio.Group
            optionType="button"
            options={[
              { value: 'prescription', label: 'Prescription' },
              { value: 'otc', label: 'OTC' },
              { value: 'controlled', label: 'Controlled' },
            ]}
          />
        </Form.Item>
        <Space style={{ width: '100%' }} align="start">
          <Form.Item
            name="classificationSource"
            label="Classification source"
            rules={[
              {
                required: classification === 'otc',
                whitespace: true,
                message: 'An OTC medicine needs the source of its classification.',
              },
            ]}
          >
            <Input maxLength={200} placeholder="e.g. Label, reg. VD-12345-10" style={{ width: 360 }} />
          </Form.Item>
          <Form.Item
            name="classificationDate"
            label="Classification date"
            rules={[
              {
                required: classification === 'otc',
                message: 'An OTC medicine needs the date of its classification.',
              },
            ]}
          >
            <Input type="date" style={{ width: 200 }} />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} align="start" wrap>
          <Form.Item
            name="currentPrice"
            label="Selling price (VND per base unit)"
            rules={[
              { required: true, message: 'Price is required.' },
              wholeNumber('Price', { min: 1 }),
            ]}
          >
            <InputNumber<number>
              style={{ width: 200 }}
              formatter={(v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number((v ?? '').replace(/\./g, ''))}
            />
          </Form.Item>
          <Form.Item
            name="reorderLevel"
            label="Reorder level"
            rules={[wholeNumber('Reorder level', { min: 0 })]}
          >
            <InputNumber style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="lowStockMonitored" label="Low-stock alerts" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="expiryAlertDays"
            label="Expiry alert (days)"
            rules={[wholeNumber('Expiry alert', { min: 0, max: 3650 })]}
          >
            <InputNumber style={{ width: 130 }} />
          </Form.Item>
        </Space>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}
