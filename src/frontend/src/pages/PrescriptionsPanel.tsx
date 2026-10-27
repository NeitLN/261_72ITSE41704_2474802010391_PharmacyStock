import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useState } from 'react';
import { type Customer, customersApi } from '../api/customers';
import { showApiError, toApiError } from '../api/errors';
import { type Medicine, medicinesApi } from '../api/medicines';
import { type Prescriber, prescribersApi } from '../api/prescribers';
import {
  type Prescription,
  type PrescriptionInput,
  type PrescriptionItemInput,
  type PrescriptionStatus,
  type PrescriptionSummary,
  prescriptionsApi,
} from '../api/prescriptions';
import { useLoad } from '../api/useLoad';
import { decimal, wholeNumber } from '../forms/numberRules';
import { STATUSES, statusOf, TONE_COLOURS } from '../ui/status';
import { StatusTag } from '../ui/tags';
import { QuickCreateCustomerModal } from './QuickCreateCustomerModal';
import { QuickCreatePrescriberModal } from './QuickCreatePrescriberModal';

const NO_PRESCRIPTIONS: PrescriptionSummary[] = [];
const NO_CUSTOMERS: Customer[] = [];
const NO_PRESCRIBERS: Prescriber[] = [];
const NO_MEDICINES: Medicine[] = [];

/**
 * Today's business date, `YYYY-MM-DD` in Asia/Ho_Chi_Minh (decision 10), the
 * same calendar the API uses, whatever the browser's time zone.
 */
function businessToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Adds whole days to a `YYYY-MM-DD` date. Display only; the server computes. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole months between a birth date and a date, for the under-72-months group. */
function ageMonthsAt(birth: string, today: string): number {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
}

/** UC05 Take in a prescription: list, entry form with quick-create, details. */
export function PrescriptionsPanel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PrescriptionStatus | undefined>(undefined);
  const [forming, setForming] = useState<Prescription | 'new' | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(
    () =>
      prescriptionsApi.list({
        search: search || undefined,
        status,
      }),
    [search, status],
  );
  const { data: prescriptions, loading, reload } = useLoad(fetchPrescriptions, NO_PRESCRIPTIONS);

  const columns: ColumnsType<PrescriptionSummary> = [
    { title: 'Reference', dataIndex: 'referenceNumber', width: 150 },
    { title: 'Issued', dataIndex: 'issuedDate', width: 110 },
    {
      title: 'Valid until',
      dataIndex: 'validUntil',
      width: 150,
      render: (validUntil: string, p) =>
        p.isExpired ? (
          <Space>
            <Typography.Text type="danger">{validUntil}</Typography.Text>
            <Tag variant="filled" style={{ ...TONE_COLOURS.danger, marginInlineEnd: 0 }}>
              Expired
            </Tag>
          </Space>
        ) : (
          validUntil
        ),
    },
    {
      title: 'Patient',
      render: (_, p) => `${p.customer.code} — ${p.customer.fullName}`,
    },
    { title: 'Prescriber', render: (_, p) => p.prescriber.fullName, width: 180 },
    { title: 'Lines', dataIndex: 'itemCount', width: 70, align: 'right' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 160,
      render: (s: PrescriptionStatus) => <StatusTag kind="prescription" value={s} />,
    },
    {
      title: '',
      key: 'view',
      width: 80,
      render: (_, p) => (
        <Button size="small" onClick={() => setViewingId(p.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
        <Input.Search
          allowClear
          placeholder="Search reference, patient, prescriber"
          onSearch={(value) => setSearch(value.trim())}
          style={{ width: 320 }}
        />
        <Select<PrescriptionStatus | ''>
          value={status ?? ''}
          onChange={(v) => setStatus(v === '' ? undefined : (v as PrescriptionStatus))}
          style={{ width: 190 }}
          options={[
            { value: '', label: 'All statuses' },
            ...(Object.keys(STATUSES.prescription) as PrescriptionStatus[]).map((s) => ({
              value: s,
              label: statusOf('prescription', s).label,
            })),
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setForming('new')}>
          New prescription
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={prescriptions}
        loading={{ spinning: loading, delay: 300 }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No prescription matches this search and status. Use New prescription to take one in.' }}
        style={{ marginTop: 16 }}
      />

      <PrescriptionFormModal
        key={forming === 'new' ? 'new' : (forming?.id ?? 'closed')}
        prescription={forming}
        onClose={() => setForming(null)}
        onSaved={(saved) => {
          setForming(null);
          reload();
          setViewingId(saved.id);
        }}
      />
      {viewingId && (
        <PrescriptionDetailsModal
          id={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={(p) => {
            setViewingId(null);
            setForming(p);
          }}
          onChanged={reload}
        />
      )}
    </>
  );
}

interface FormValues extends Omit<PrescriptionInput, 'issuedDate'> {
  issuedDate: Dayjs;
}

const EMPTY_ITEM: PrescriptionItemInput = {
  medicineId: '',
  strength: '',
  // Empty until the pharmacist fills them; the required rules enforce values.
  quantityPrescribed: undefined as unknown as number,
  dose: '',
  route: '',
  daysOfUse: undefined as unknown as number,
};

/** Remounted (via `key`) each time it opens, so it starts from the values. */
function PrescriptionFormModal({
  prescription,
  onClose,
  onSaved,
}: {
  prescription: Prescription | 'new' | null;
  onClose: () => void;
  onSaved: (saved: Prescription) => void;
}) {
  const { modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [prescriberSearch, setPrescriberSearch] = useState('');
  const [quickCustomer, setQuickCustomer] = useState(false);
  const [quickPrescriber, setQuickPrescriber] = useState(false);
  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([]);
  const [extraPrescribers, setExtraPrescribers] = useState<Prescriber[]>([]);
  const isNew = prescription === 'new';

  const fetchCustomers = useCallback(
    () => customersApi.list(customerSearch || undefined),
    [customerSearch],
  );
  const fetchPrescribers = useCallback(
    () => prescribersApi.list({ search: prescriberSearch || undefined }),
    [prescriberSearch],
  );
  const fetchMedicines = useCallback(() => medicinesApi.list({}), []);
  const { data: foundCustomers } = useLoad(fetchCustomers, NO_CUSTOMERS);
  const { data: foundPrescribers } = useLoad(fetchPrescribers, NO_PRESCRIBERS);
  const { data: medicines } = useLoad(fetchMedicines, NO_MEDICINES);

  const issuedDate = Form.useWatch('issuedDate', form);
  const ageYears = Form.useWatch('patientAgeYears', form);
  const customerId = Form.useWatch('customerId', form);

  if (!prescription) return null;
  const editing: Prescription | null = prescription === 'new' ? null : prescription;

  const customers = [...extraCustomers, ...foundCustomers].filter(
    (c, i, all) => all.findIndex((x) => x.id === c.id) === i,
  );
  const prescribers = [...extraPrescribers, ...foundPrescribers].filter(
    (p, i, all) => all.findIndex((x) => x.id === p.id) === i,
  );

  // Same order as the server (FR-13): the date of birth wins, measured at the
  // issue date of the prescription; the typed age is used only without one.
  const chosenCustomer = customers.find((c) => c.id === customerId);
  const ageAt = issuedDate ? issuedDate.format('YYYY-MM-DD') : businessToday();
  const showChildGroup = chosenCustomer?.dateOfBirth
    ? ageMonthsAt(chosenCustomer.dateOfBirth, ageAt) < 72
    : ageYears != null && ageYears < 6;

  const initialValues: Partial<FormValues> = editing
    ? {
        referenceNumber: editing.referenceNumber,
        issuedDate: dayjs(editing.issuedDate, 'YYYY-MM-DD'),
        customerId: editing.customer.id,
        prescriberId: editing.prescriber.id,
        patientAgeYears: editing.patientAgeYears ?? undefined,
        patientAgeMonths: editing.patientAgeMonths ?? undefined,
        patientWeightKg:
          editing.patientWeightKg === null ? undefined : Number(editing.patientWeightKg),
        accompanyingAdult: editing.accompanyingAdult ?? undefined,
        items: editing.items.map((item) => ({
          medicineId: item.medicine.id,
          strength: item.strength,
          quantityPrescribed: item.quantityPrescribed,
          dose: item.dose,
          route: item.route,
          daysOfUse: item.daysOfUse,
        })),
      }
    : { issuedDate: dayjs(businessToday(), 'YYYY-MM-DD'), items: [EMPTY_ITEM] };

  async function save(input: PrescriptionInput) {
    setSaving(true);
    setFormError(null);
    try {
      onSaved(editing ? await prescriptionsApi.update(editing.id, input) : await prescriptionsApi.create(input));
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  function submit(values: FormValues) {
    const input: PrescriptionInput = {
      referenceNumber: values.referenceNumber,
      issuedDate: values.issuedDate.format('YYYY-MM-DD'),
      customerId: values.customerId,
      prescriberId: values.prescriberId,
      patientAgeYears: values.patientAgeYears ?? null,
      patientAgeMonths: values.patientAgeMonths ?? null,
      patientWeightKg: values.patientWeightKg ?? null,
      accompanyingAdult: values.accompanyingAdult || null,
      items: values.items,
    };
    // Saving a VERIFIED prescription returns it to RECEIVED (FR-44).
    if (editing?.status === 'verified') {
      modal.confirm({
        title: 'Save changes?',
        content: 'Saving returns this prescription to RECEIVED; it must be verified again.',
        okText: 'Save anyway',
        onOk: () => save(input),
      });
    } else {
      void save(input);
    }
  }

  return (
    <Modal
      open
      title={isNew ? 'New prescription' : `Edit prescription ${editing?.referenceNumber}`}
      okText="Save"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={1080}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={submit}
        // Frozen while saving, so an error for line N still means the line sent.
        disabled={saving}
      >
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name="referenceNumber"
              label="Reference"
              rules={[{ required: true, whitespace: true, message: 'Reference is required.' }]}
            >
              <Input maxLength={50} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="issuedDate"
              label="Issue date"
              rules={[{ required: true, message: 'Issue date is required.' }]}
            >
              <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Valid until">
              <Typography.Text type="secondary">
                {issuedDate
                  ? `${addDays(issuedDate.format('YYYY-MM-DD'), 5)} (computed)`
                  : 'Choose the issue date first'}
              </Typography.Text>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="customerId"
              label="Patient"
              rules={[{ required: true, message: 'Choose a patient.' }]}
            >
              <Select
                showSearch
                filterOption={false}
                onSearch={setCustomerSearch}
                placeholder="Search patients"
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.code} — ${c.fullName}`,
                }))}
              />
            </Form.Item>
            <Button size="small" onClick={() => setQuickCustomer(true)} style={{ marginTop: -8 }}>
              New patient
            </Button>
          </Col>
          <Col span={12}>
            <Form.Item
              name="prescriberId"
              label="Prescriber"
              rules={[{ required: true, message: 'Choose a prescriber.' }]}
            >
              <Select
                showSearch
                filterOption={false}
                onSearch={setPrescriberSearch}
                placeholder="Search prescribers"
                options={prescribers.map((p) => ({
                  value: p.id,
                  label: `${p.fullName} (${p.licenceNumber})`,
                }))}
              />
            </Form.Item>
            <Button size="small" onClick={() => setQuickPrescriber(true)} style={{ marginTop: -8 }}>
              New prescriber
            </Button>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name="patientAgeYears"
              label="Age (years)"
              rules={[wholeNumber('Age', { min: 0, max: 150 })]}
            >
              <InputNumber<number> style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {showChildGroup && (
          <Card size="small" title="Child under 72 months" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  name="patientAgeMonths"
                  label="Age (months)"
                  rules={[wholeNumber('Age in months', { min: 0, max: 71 })]}
                >
                  <InputNumber<number> style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="patientWeightKg"
                  label="Weight (kg)"
                  rules={[decimal('Weight', { min: 0.1, max: 200, decimals: 2 })]}
                >
                  <InputNumber<number> style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="accompanyingAdult" label="Accompanying adult">
                  <Input maxLength={200} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        <Form.List name="items" rules={[{ validator: (_, v) => (v?.length ? Promise.resolve() : Promise.reject(new Error('Add at least one line.'))) }]}>
          {(fields, { add, remove }, { errors }) => (
            <div style={{ marginTop: 8 }}>
              {fields.map((field, index) => (
                <Space key={field.key} align="start" wrap style={{ display: 'flex' }}>
                  <Form.Item
                    name={[field.name, 'medicineId']}
                    label={index === 0 ? 'Medicine' : undefined}
                    rules={[{ required: true, message: 'Choose a medicine.' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Medicine"
                      aria-label={`Line ${index + 1} medicine`}
                      style={{ width: 260 }}
                      options={medicines.map((m) => ({
                        value: m.id,
                        label: `${m.code} — ${m.name} (${m.classification})`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'strength']}
                    label={index === 0 ? 'Strength' : undefined}
                    rules={[{ required: true, whitespace: true, message: 'Strength is required.' }]}
                  >
                    <Input maxLength={100} aria-label={`Line ${index + 1} strength`} style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantityPrescribed']}
                    label={index === 0 ? 'Quantity' : undefined}
                    rules={[
                      { required: true, message: 'Quantity is required.' },
                      wholeNumber('Quantity', { min: 1, max: 100_000 }),
                    ]}
                  >
                    <InputNumber<number>
                      aria-label={`Line ${index + 1} quantity`}
                      style={{ width: 100 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'dose']}
                    label={index === 0 ? 'Dose' : undefined}
                    rules={[{ required: true, whitespace: true, message: 'Dose is required.' }]}
                  >
                    <Input maxLength={200} aria-label={`Line ${index + 1} dose`} style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'route']}
                    label={index === 0 ? 'Route' : undefined}
                    rules={[{ required: true, whitespace: true, message: 'Route is required.' }]}
                  >
                    <Input maxLength={100} aria-label={`Line ${index + 1} route`} style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'daysOfUse']}
                    label={index === 0 ? 'Days' : undefined}
                    rules={[
                      { required: true, message: 'Days of use is required.' },
                      wholeNumber('Days of use', { min: 1, max: 365 }),
                    ]}
                  >
                    <InputNumber<number>
                      aria-label={`Line ${index + 1} days of use`}
                      style={{ width: 80 }}
                    />
                  </Form.Item>
                  <Form.Item label={index === 0 ? ' ' : undefined}>
                    <Button
                      icon={<DeleteOutlined />}
                      aria-label={`Remove line ${index + 1}`}
                      disabled={fields.length === 1 || saving}
                      onClick={() => remove(field.name)}
                    />
                  </Form.Item>
                </Space>
              ))}
              <div>
                <Button icon={<PlusOutlined />} disabled={saving} onClick={() => add(EMPTY_ITEM)}>
                  Add line
                </Button>
              </div>
              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>

      {quickCustomer && (
        <QuickCreateCustomerModal
          onClose={() => setQuickCustomer(false)}
          onCreated={(c) => {
            setExtraCustomers((prev) => [...prev, c]);
            form.setFieldValue('customerId', c.id);
            setQuickCustomer(false);
          }}
        />
      )}
      {quickPrescriber && (
        <QuickCreatePrescriberModal
          onClose={() => setQuickPrescriber(false)}
          onCreated={(p) => {
            setExtraPrescribers((prev) => [...prev, p]);
            form.setFieldValue('prescriberId', p.id);
            setQuickPrescriber(false);
          }}
        />
      )}
    </Modal>
  );
}

function PrescriptionDetailsModal({
  id,
  onClose,
  onEdit,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onEdit: (p: Prescription) => void;
  onChanged: () => void;
}) {
  const { message, modal } = App.useApp();
  const [verifyNote, setVerifyNote] = useState('');
  // Two states: the note box is open, and the request is on its way.
  const [reviewing, setReviewing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const fetchPrescription = useCallback(
    () =>
      prescriptionsApi.get(id).catch((error: unknown) => {
        message.error(toApiError(error).message);
        return null;
      }),
    [id, message],
  );
  const { data: prescription, loading, reload } = useLoad<Prescription | null>(fetchPrescription, null);

  async function verify() {
    if (!prescription) return;
    setVerifying(true);
    try {
      await prescriptionsApi.verify(prescription.id, verifyNote || undefined);
      message.success('Prescription verified.');
      setVerifyNote('');
      setReviewing(false);
      reload();
      onChanged();
    } catch (error) {
      message.error(toApiError(error).message);
    } finally {
      setVerifying(false);
    }
  }

  const editable =
    prescription !== null &&
    (prescription.status === 'received' || prescription.status === 'verified');

  return (
    <Modal
      open
      title={prescription ? `Prescription ${prescription.referenceNumber}` : 'Prescription'}
      footer={null}
      onCancel={onClose}
      width={900}
    >
      {prescription && (
        <>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Patient">
              {`${prescription.customer.code} — ${prescription.customer.fullName}`}
            </Descriptions.Item>
            <Descriptions.Item label="Prescriber">
              {`${prescription.prescriber.fullName} (${prescription.prescriber.licenceNumber})`}
            </Descriptions.Item>
            <Descriptions.Item label="Issued">{prescription.issuedDate}</Descriptions.Item>
            <Descriptions.Item label="Valid until">
              {prescription.isExpired ? (
                <Space>
                  <Typography.Text type="danger">{prescription.validUntil}</Typography.Text>
                  <Tag variant="filled" style={{ ...TONE_COLOURS.danger, marginInlineEnd: 0 }}>
                    Expired
                  </Tag>
                </Space>
              ) : (
                prescription.validUntil
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag kind="prescription" value={prescription.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Verified by">
              {prescription.verifiedBy
                ? `${prescription.verifiedBy.fullName} at ${prescription.verifiedAt ?? '—'}`
                : '—'}
            </Descriptions.Item>
            {prescription.verificationNote && (
              <Descriptions.Item label="Review note">{prescription.verificationNote}</Descriptions.Item>
            )}
          </Descriptions>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            loading={{ spinning: loading, delay: 300 }}
            dataSource={prescription.items}
            style={{ marginTop: 16 }}
            columns={[
              {
                title: 'Medicine',
                render: (_, item) => `${item.medicine.code} — ${item.medicine.name}`,
              },
              { title: 'Strength', dataIndex: 'strength' },
              { title: 'Prescribed', dataIndex: 'quantityPrescribed', align: 'right' },
              { title: 'Dispensed', dataIndex: 'quantityDispensed', align: 'right' },
              { title: 'Outstanding', dataIndex: 'quantityOutstanding', align: 'right' },
            ]}
          />
          <Space style={{ marginTop: 16 }} wrap>
            {prescription.status === 'received' &&
              (reviewing ? (
                <Space>
                  <Input
                    placeholder="Review note (optional)"
                    value={verifyNote}
                    onChange={(e) => setVerifyNote(e.target.value)}
                    style={{ width: 280 }}
                  />
                  <Button type="primary" loading={verifying} onClick={verify}>
                    Confirm verify
                  </Button>
                </Space>
              ) : (
                <Button type="primary" onClick={() => setReviewing(true)}>
                  Verify
                </Button>
              ))}
            {editable && (
              <Button
                onClick={() =>
                  modal.confirm({
                    title: 'Edit prescription?',
                    content:
                      prescription.status === 'verified'
                        ? 'Saving returns this prescription to RECEIVED; it must be verified again.'
                        : undefined,
                    okText: 'Edit',
                    onOk: () => onEdit(prescription),
                  })
                }
              >
                Edit
              </Button>
            )}
          </Space>
        </>
      )}
    </Modal>
  );
}
