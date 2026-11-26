import { DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Form, Modal, Select, Space, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { showApiError } from '../api/errors';
import { medicinesApi, type Reference } from '../api/medicines';
import {
  type MovementLine,
  reportsApi,
  type StockMovementQuery,
  type StockMovementReport,
  type StockMovementRow,
} from '../api/reports';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { useBusinessToday } from '../api/clock';
import { downloadCsv, toCsv } from '../ui/csv';
import { formatDateTime, formatVnd } from '../ui/format';
import { DateField } from '../forms/DateField';
import { LabelledSwitch } from '../ui/ListToolbar';

const NO_REFERENCE = { categories: [] as Reference[], units: [] as Reference[] };

/** The first of this month to today, on the server's business date (#255). */
function defaultPeriod(today: string): StockMovementQuery {
  return { from: `${today.slice(0, 8)}01`, to: today };
}

const signed = (n: number) => (n > 0 ? `+${n}` : n === 0 ? '' : `${n}`);

const TYPE_LABELS: Record<string, string> = {
  receipt: 'Receipt',
  dispense: 'Dispense',
  sale: 'Sale',
  return: 'Return',
  release: 'Release',
  reject: 'Reject',
  write_off: 'Write-off',
  destroy: 'Destroy',
  adjustment: 'Adjustment',
};

/**
 * UC12 Produce a stock movement report (FR-37, DEC-06). Every figure is a
 * sum of stock movements; a row whose own check fails is flagged (A3).
 */
export function StockMovementPanel() {
  const [form] = Form.useForm<StockMovementQuery>();
  const today = useBusinessToday();
  // The server's date can arrive after the form shows; move an untouched period to it.
  useEffect(() => {
    if (!form.isFieldsTouched()) form.setFieldsValue(defaultPeriod(today));
  }, [form, today]);
  const [report, setReport] = useState<StockMovementReport | null>(null);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<StockMovementRow | null>(null);
  const [hideEmpty, setHideEmpty] = useState(true);
  const fetchReference = useCallback(() => medicinesApi.referenceData(), []);
  const { data: reference } = useLoad(fetchReference, NO_REFERENCE);

  async function run(values: StockMovementQuery) {
    setRunning(true);
    setFormError(null);
    try {
      setReport(
        await reportsApi.stockMovement({
          from: values.from,
          to: values.to,
          ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        }),
      );
    } catch (error) {
      setReport(null);
      setFormError(showApiError(form, error));
    } finally {
      setRunning(false);
    }
  }

  // The quantity columns, in ledger order, with how to read each one and its total.
  const quantities: Array<{ title: string; value: (r: StockMovementRow) => number; total: number }> = [
    { title: 'Opening', value: (r) => r.opening, total: report?.totals.opening ?? 0 },
    { title: 'Received', value: (r) => r.received, total: report?.totals.received ?? 0 },
    { title: 'Dispensed', value: (r) => r.dispensed, total: report?.totals.dispensed ?? 0 },
    { title: 'Sold', value: (r) => r.sold, total: report?.totals.sold ?? 0 },
    { title: 'Returned', value: (r) => r.returned, total: report?.totals.returned ?? 0 },
    { title: 'Released', value: (r) => r.released, total: report?.totals.released ?? 0 },
    { title: 'Rejected', value: (r) => r.rejected, total: report?.totals.rejected ?? 0 },
    { title: 'Written off', value: (r) => r.writtenOff, total: report?.totals.writtenOff ?? 0 },
    { title: 'Destroyed', value: (r) => r.destroyed, total: report?.totals.destroyed ?? 0 },
    { title: 'Adjusted', value: (r) => r.adjusted, total: report?.totals.adjusted ?? 0 },
    { title: 'Closing', value: (r) => r.closing.total, total: report?.totals.closing.total ?? 0 },
    { title: 'Net issued', value: (r) => r.netIssued, total: report?.totals.netIssued ?? 0 },
  ];
  // A movement type nobody used in the period is hidden unless asked for; opening, closing and
  // net issued always stay.
  const ALWAYS = ['Opening', 'Closing', 'Net issued'];
  const shown = quantities.filter(
    (q) => !hideEmpty || ALWAYS.includes(q.title) || (report?.rows ?? []).some((r) => q.value(r) !== 0),
  );
  const hiddenCount = quantities.length - shown.length;

  const columns: ColumnsType<StockMovementRow> = [
    {
      title: 'Medicine',
      fixed: 'left',
      width: 240,
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <span>
            {r.medicine.code} — {r.medicine.name}
          </span>
          {!r.checkOk && (
            <Typography.Text type="danger">
              <WarningOutlined /> check failed
            </Typography.Text>
          )}
        </Space>
      ),
    },
    // The column the rows are sorted by comes first, so the order makes sense at a glance.
    {
      title: 'Cost of net issued',
      align: 'right',
      width: 150,
      className: 'nowrap',
      render: (_, r) => formatVnd(r.costNetIssued),
    },
    ...shown.map((q) => ({
      title: q.title,
      align: 'right' as const,
      width: 100,
      className: 'nowrap',
      // A 0 is quieter than a real movement, so the numbers that matter stand out.
      render: (_: unknown, r: StockMovementRow) => {
        const v = q.value(r);
        return <span className={v === 0 ? 'qty-zero' : undefined}>{v}</span>;
      },
    })),
  ];

  /** The table's own columns and raw API values (FR-43). */
  function exportCsv() {
    if (!report) return;
    const headers = [
      'Medicine',
      'Opening',
      'Received',
      'Dispensed',
      'Sold',
      'Returned',
      'Released',
      'Rejected',
      'Written off',
      'Destroyed',
      'Adjusted',
      'Closing',
      'Net issued',
      'Cost of net issued',
    ];
    const rows = report.rows.map((r) => [
      `${r.medicine.code} — ${r.medicine.name}`,
      r.opening,
      r.received,
      r.dispensed,
      r.sold,
      r.returned,
      r.released,
      r.rejected,
      r.writtenOff,
      r.destroyed,
      r.adjusted,
      r.closing.total,
      r.netIssued,
      r.costNetIssued,
    ]);
    downloadCsv(
      `stock-movement-${report.query.from}-to-${report.query.to}.csv`,
      toCsv(headers, rows),
    );
  }

  const totals = report?.totals;

  return (
    <>
      <Form
        form={form}
        layout="inline"
        initialValues={defaultPeriod(today)}
        onFinish={run}
        disabled={running}
      >
        <Form.Item name="from" label="From" rules={[{ required: true, message: 'Choose the first day.' }]}>
          <DateField style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="to" label="To" rules={[{ required: true, message: 'Choose the last day.' }]}>
          <DateField style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="categoryId">
          <Select
            allowClear
            placeholder="All categories"
            style={{ width: 220 }}
            options={reference.categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={running}>
            Run
          </Button>
        </Form.Item>
        <Form.Item>
          <LabelledSwitch>
            <Switch checked={hideEmpty} onChange={setHideEmpty} />
            Hide unused movement types
          </LabelledSwitch>
        </Form.Item>
        <Form.Item>
          <Button
            icon={<DownloadOutlined />}
            disabled={!report || report.rows.length === 0}
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </Form.Item>
      </Form>
      {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      {!report && !running && !formError && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
          Choose a period and press Run. The report lists, per medicine, the stock at the start,
          every movement in the period and the stock at the end; it changes nothing.
        </Typography.Paragraph>
      )}

      {report && (
        <>
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            Period {report.query.from} – {report.query.to} · produced {formatDateTime(report.producedAt)} by{' '}
            {report.producedBy.fullName} · sorted by cost of net issued
            {hiddenCount > 0 && ` · ${hiddenCount} unused movement ${hiddenCount === 1 ? 'type' : 'types'} hidden`}
          </Typography.Paragraph>
          <Table
            rowKey={(r) => r.medicine.id}
            size="small"
            columns={[
              ...columns,
              {
                title: '',
                fixed: 'right',
                width: 110,
                // A real button, so the movements open from the keyboard too.
                render: (_, r) => (
                  <Button
                    size="small"
                    aria-label={`Movements of ${r.medicine.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRow(r);
                    }}
                  >
                    Movements
                  </Button>
                ),
              },
            ]}
            dataSource={report.rows}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No stock or movements in this period.' }}
            onRow={(r) => ({ onClick: () => setOpenRow(r), style: { cursor: 'pointer' } })}
            summary={() =>
              totals && report.rows.length > 0 ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <strong>Total · {report.rows.length} medicines</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <strong className="nowrap">{formatVnd(totals.costNetIssued)}</strong>
                  </Table.Summary.Cell>
                  {shown.map((q, i) => (
                    <Table.Summary.Cell key={q.title} index={i + 2} align="right">
                      <strong>{q.total}</strong>
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell index={shown.length + 2} />
                </Table.Summary.Row>
              ) : null
            }
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            Opening and closing are the total of the three stock states. Net issued = dispensed +
            sold − released. Cost is at each batch’s unit cost and is <strong>not revenue</strong>.
            Click a row to see its movements.
          </Typography.Paragraph>
        </>
      )}
      {openRow && report && (
        <MovementsModal row={openRow} query={report.query} onClose={() => setOpenRow(null)} />
      )}
    </>
  );
}

function MovementsModal({
  row,
  query,
  onClose,
}: {
  row: StockMovementRow;
  query: StockMovementQuery;
  onClose: () => void;
}) {
  const fetchMovements = useCallback(
    () => reportsApi.movements(row.medicine.id, query),
    [row.medicine.id, query],
  );
  const { data, loading, error: loadError } = useLoad(fetchMovements, null);
  const columns: ColumnsType<MovementLine> = [
    { title: 'Time', width: 170, render: (_, m) => formatDateTime(m.occurredAt) },
    {
      title: 'Type',
      width: 140,
      render: (_, m) => `${TYPE_LABELS[m.type] ?? m.type}${m.isReversal ? ' (reversal)' : ''}`,
    },
    { title: 'Batch', dataIndex: 'batchNumber', width: 110 },
    { title: 'Sellable', align: 'right', width: 90, render: (_, m) => signed(m.deltaSellable) },
    { title: 'Quarantine', align: 'right', width: 100, render: (_, m) => signed(m.deltaQuarantine) },
    { title: 'Pending', align: 'right', width: 90, render: (_, m) => signed(m.deltaPendingDestruction) },
    { title: 'By', dataIndex: 'performedBy', width: 160 },
    { title: 'Document', render: (_, m) => m.source.reference ?? '—' },
  ];
  return (
    <Modal
      open
      width={1000}
      title={`${row.medicine.code} — ${row.medicine.name} · ${query.from} – ${query.to}`}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {loadError && <LoadFailed error={loadError} />}
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={data?.movements ?? []}
        pagination={false}
        locale={{ emptyText: 'No movement in this period.' }}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        Every movement of the period in the order it was written. A reversal keeps the type of what
        it reverses and counts in that column with the opposite sign.
      </Typography.Paragraph>
    </Modal>
  );
}
