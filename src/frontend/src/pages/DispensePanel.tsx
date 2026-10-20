import {
  App,
  Button,
  Descriptions,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useState } from 'react';
import {
  type DispensePreview,
  type DispenseResult,
  dispensingApi,
  type ExpiryWarning,
} from '../api/dispensing';
import { type FieldError, toApiError } from '../api/errors';
import {
  DISPENSABLE_STATUSES,
  type Prescription,
  type PrescriptionSummary,
  prescriptionsApi,
} from '../api/prescriptions';
import { useLoad } from '../api/useLoad';

const NO_OPTIONS: PrescriptionSummary[] = [];

type ItemErrors = Record<string, { quantity?: string; note?: string }>;

/**
 * Maps the server's `items.N.quantity` / `items.N.partialSupplyNote` errors
 * back to the prescription item they belong to. N indexes the items sent,
 * which skip items with nothing to hand over.
 */
function errorsByItem(
  errors: FieldError[],
  sentItems: Array<{ prescriptionItemId: string }>,
): ItemErrors {
  const byItem: ItemErrors = {};
  for (const e of errors) {
    const m = /^items\.(\d+)\.(quantity|partialSupplyNote)$/.exec(e.field);
    if (!m) continue;
    const itemId = sentItems[Number(m[1])]?.prescriptionItemId;
    if (!itemId) continue;
    byItem[itemId] ??= {};
    if (m[2] === 'quantity') byItem[itemId].quantity = e.message;
    else byItem[itemId].note = e.message;
  }
  return byItem;
}

/** BR02, FR-16: how a near-expiry batch is flagged, here and on the sales receipt. */
export function WarningTag({ warning }: { warning: ExpiryWarning }) {
  return (
    <Tag color="orange">
      {warning.kind === 'WITHIN_ALERT_WINDOW'
        ? `Expires in ${warning.daysLeft} days`
        : `Expires before the course ends (${warning.daysLeft} days left)`}
    </Tag>
  );
}

/**
 * UC06 Dispense against a prescription: pick a verified prescription, preview
 * the FEFO batches, confirm the hand-over. Every batch, warning and quantity
 * comes from the server; the screen never computes stock.
 */
export function DispensePanel() {
  const { modal } = App.useApp();
  const [search, setSearch] = useState('');
  const [prescriptionId, setPrescriptionId] = useState<string | undefined>(undefined);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<DispensePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [result, setResult] = useState<DispenseResult | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ItemErrors>({});

  const fetchOptions = useCallback(
    () => prescriptionsApi.list({ search: search || undefined }),
    [search],
  );
  const { data: options } = useLoad(fetchOptions, NO_OPTIONS);
  const dispensable = options.filter((o) => DISPENSABLE_STATUSES.includes(o.status));

  async function select(id: string) {
    setPrescriptionId(id);
    setLoadingDetail(true);
    setTopError(null);
    try {
      const p = await prescriptionsApi.get(id);
      setPrescription(p);
      setQuantities(
        Object.fromEntries(p.items.map((item) => [item.id, item.quantityOutstanding])),
      );
      setNotes({});
      setPreview(null);
      setRequestId(null);
      setResult(null);
      setFieldErrors({});
    } catch (error) {
      setPrescription(null);
      setTopError(toApiError(error).message);
    } finally {
      setLoadingDetail(false);
    }
  }

  function changeQuantity(itemId: string, value: number | null) {
    setQuantities((prev) => ({ ...prev, [itemId]: value ?? 0 }));
    // Quantities changed after a preview: the preview no longer applies.
    setPreview(null);
    setRequestId(null);
    setResult(null);
  }

  async function runPreview() {
    if (!prescription) return;
    setPreviewing(true);
    setTopError(null);
    setFieldErrors({});
    const sentItems = prescription.items
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({ prescriptionItemId: item.id, quantity: quantities[item.id] }));
    try {
      setPreview(await dispensingApi.preview({ prescriptionId: prescription.id, items: sentItems }));
    } catch (error) {
      // e.g. BR07 "more than outstanding" on items.N.quantity: show it under that item.
      const apiError = toApiError(error);
      setPreview(null);
      setFieldErrors(errorsByItem(apiError.errors, sentItems));
      setTopError(apiError.message);
    } finally {
      setPreviewing(false);
    }
  }

  function confirmHandover() {
    if (!prescription || !preview) return;
    modal.confirm({
      title: 'Confirm hand-over?',
      content: 'Stock leaves the shelf now. Continue?',
      okText: 'Hand over',
      onOk: () => handOver(),
    });
  }

  async function handOver() {
    if (!prescription || !preview) return;
    // One request ID per confirmation; a retry resends the same one (FR-23).
    const rid = requestId ?? crypto.randomUUID();
    setRequestId(rid);
    setConfirming(true);
    setTopError(null);
    const sentItems = preview.items.map((pi) => ({
      prescriptionItemId: pi.prescriptionItemId,
      quantity: pi.requested,
      ...(notes[pi.prescriptionItemId] ? { partialSupplyNote: notes[pi.prescriptionItemId] } : {}),
    }));
    try {
      const done = await dispensingApi.dispense({
        prescriptionId: prescription.id,
        items: sentItems,
        requestId: rid,
      });
      setResult(done);
      setRequestId(null);
    } catch (error) {
      const apiError = toApiError(error);
      setFieldErrors(errorsByItem(apiError.errors, sentItems));
      setTopError(apiError.message);
    } finally {
      setConfirming(false);
    }
  }

  function resetAll() {
    setSearch('');
    setPrescriptionId(undefined);
    setPrescription(null);
    setQuantities({});
    setNotes({});
    setPreview(null);
    setRequestId(null);
    setResult(null);
    setTopError(null);
    setFieldErrors({});
  }

  const hasShortage = (preview?.items ?? []).some((pi) => pi.batches.length === 0);
  const missingNote = (preview?.items ?? []).some(
    (pi) => pi.needsPartialSupplyNote && !notes[pi.prescriptionItemId]?.trim(),
  );
  const canConfirm = preview !== null && !hasShortage && !missingNote && result === null;

  return (
    <>
      {result ? (
        <DispenseResultView result={result} onNew={resetAll} />
      ) : (
        <>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Typography.Text strong>Step 1 — Choose a verified prescription</Typography.Text>
              <Select
                showSearch
                filterOption={false}
                onSearch={setSearch}
                value={prescriptionId}
                onChange={select}
                placeholder="Search prescriptions"
                style={{ width: '100%', marginTop: 8 }}
                options={dispensable.map((o) => ({
                  value: o.id,
                  label: `${o.referenceNumber} — ${o.customer.fullName}${o.isExpired ? ' (expired)' : ''}`,
                }))}
              />
            </div>

            {prescription && (
              <div>
                <Typography.Text strong>Step 2 — Quantities to hand over now</Typography.Text>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  loading={loadingDetail}
                  dataSource={prescription.items}
                  style={{ marginTop: 8 }}
                  columns={[
                    {
                      title: 'Medicine',
                      render: (_, item) => `${item.medicine.code} — ${item.medicine.name}`,
                    },
                    { title: 'Strength', dataIndex: 'strength' },
                    { title: 'Prescribed', dataIndex: 'quantityPrescribed', align: 'right' },
                    { title: 'Dispensed', dataIndex: 'quantityDispensed', align: 'right' },
                    { title: 'Outstanding', dataIndex: 'quantityOutstanding', align: 'right' },
                    {
                      title: 'Hand over now',
                      align: 'right',
                      render: (_, item) => (
                        <div>
                          <InputNumber<number>
                            min={0}
                            max={item.quantityOutstanding}
                            precision={0}
                            disabled={item.quantityOutstanding === 0}
                            value={quantities[item.id] ?? 0}
                            onChange={(v) => changeQuantity(item.id, v)}
                            aria-label={`Hand over ${item.medicine.name}`}
                            style={{ width: 110 }}
                          />
                          {fieldErrors[item.id]?.quantity && (
                            <div>
                              <Typography.Text type="danger">
                                {fieldErrors[item.id]?.quantity}
                              </Typography.Text>
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
                <Button
                  type="primary"
                  onClick={runPreview}
                  loading={previewing}
                  style={{ marginTop: 12 }}
                >
                  Preview
                </Button>
              </div>
            )}

            {preview && (
              <div>
                <Typography.Text strong>Step 3 — Batches FEFO will take</Typography.Text>
                <PreviewTable
                  preview={preview}
                  notes={notes}
                  onNote={(itemId, v) => setNotes((prev) => ({ ...prev, [itemId]: v }))}
                  noteErrors={fieldErrors}
                />
                <Button
                  type="primary"
                  disabled={!canConfirm}
                  loading={confirming}
                  onClick={confirmHandover}
                  style={{ marginTop: 12 }}
                >
                  Confirm hand-over
                </Button>
                {requestId && (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                    Retrying sends the same request, so a network failure can never
                    dispense twice.
                  </Typography.Paragraph>
                )}
              </div>
            )}

            {topError && <Typography.Text type="danger">{topError}</Typography.Text>}
          </Space>
        </>
      )}
    </>
  );
}

function PreviewTable({
  preview,
  notes,
  onNote,
  noteErrors,
}: {
  preview: DispensePreview;
  notes: Record<string, string>;
  onNote: (itemId: string, value: string) => void;
  noteErrors: Record<string, { quantity?: string; note?: string }>;
}) {
  return (
    <Table
      rowKey="prescriptionItemId"
      size="small"
      pagination={false}
      dataSource={preview.items}
      style={{ marginTop: 8 }}
      columns={[
        {
          title: 'Medicine',
          render: (_, pi) => `${pi.medicine.code} — ${pi.medicine.name}`,
        },
        { title: 'Requested', dataIndex: 'requested', align: 'right' },
        {
          title: 'Batches',
          render: (_, pi) =>
            pi.batches.length === 0 ? (
              <Typography.Text type="danger">Only {pi.available} available</Typography.Text>
            ) : (
              <Space direction="vertical">
                {pi.batches.map((b) => (
                  <Space key={b.batchId} wrap>
                    <span>
                      {b.batchNumber} — exp {b.expiryDate} — {b.quantity}
                    </span>
                    {b.warning && <WarningTag warning={b.warning} />}
                  </Space>
                ))}
              </Space>
            ),
        },
        {
          title: 'Partial supply note',
          render: (_, pi) =>
            pi.needsPartialSupplyNote ? (
              <div>
                <Input
                  placeholder="Why a smaller quantity is enough"
                  value={notes[pi.prescriptionItemId] ?? ''}
                  onChange={(e) => onNote(pi.prescriptionItemId, e.target.value)}
                  aria-label={`Partial supply note for ${pi.medicine.name}`}
                />
                <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                  Confirm the effect on the treatment was assessed and discussed with
                  the customer (DEC-02).
                </Typography.Paragraph>
                {noteErrors[pi.prescriptionItemId]?.note && (
                  <Typography.Text type="danger">
                    {noteErrors[pi.prescriptionItemId]?.note}
                  </Typography.Text>
                )}
              </div>
            ) : (
              '—'
            ),
        },
      ]}
    />
  );
}

function DispenseResultView({ result, onNew }: { result: DispenseResult; onNew: () => void }) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Descriptions size="small" column={2} title="Hand-over recorded">
        <Descriptions.Item label="Status">{result.status}</Descriptions.Item>
        <Descriptions.Item label="Dispensed at">{result.dispensedAt}</Descriptions.Item>
      </Descriptions>
      {result.items.map((item) => (
        <div key={item.prescriptionItemId}>
          <Typography.Text strong>
            {item.medicine.code} — {item.medicine.name}: dispensed {item.quantityDispensed},
            outstanding {item.quantityOutstanding}
          </Typography.Text>
          <Table
            rowKey="dispenseLineId"
            size="small"
            pagination={false}
            dataSource={item.lines}
            style={{ marginTop: 8 }}
            columns={[
              { title: 'Batch', dataIndex: 'batchNumber' },
              { title: 'Expiry', dataIndex: 'expiryDate' },
              { title: 'Quantity', dataIndex: 'quantity', align: 'right' },
              {
                title: 'Warning',
                render: (_, line) => (line.warning ? <WarningTag warning={line.warning} /> : '—'),
              },
            ]}
          />
        </div>
      ))}
      <Button onClick={onNew}>New dispensing</Button>
    </Space>
  );
}
