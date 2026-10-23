import { WarningOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
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
import { formatVnd } from '../ui/format';

const NO_REFERENCE = { categories: [] as Reference[], units: [] as Reference[] };

/** Today and the first of this month, in Asia/Ho_Chi_Minh (decision 10). */
function defaultPeriod(): StockMovementQuery {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return { from: `${today.slice(0, 8)}01`, to: today };
}

const dateTime = (value: string) =>
  new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });

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
  const [report, setReport] = useState<StockMovementReport | null>(null);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<StockMovementRow | null>(null);
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

  const n = (key: keyof StockMovementRow) => ({
    dataIndex: key,
    align: 'right' as const,
    width: 90,
  });
  const columns: ColumnsType<StockMovementRow> = [
    {
      title: 'Medicine',
      fixed: 'left',
      width: 220,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
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
    { title: 'Opening', ...n('opening') },
    { title: 'Received', ...n('received') },
    { title: 'Dispensed', ...n('dispensed') },
    { title: 'Sold', ...n('sold') },
    { title: 'Returned', ...n('returned') },
    { title: 'Released', ...n('released') },
    { title: 'Rejected', ...n('rejected') },
    { title: 'Written off', ...n('writtenOff') },
    { title: 'Destroyed', ...n('destroyed') },
    { title: 'Adjusted', ...n('adjusted') },
    { title: 'Closing', align: 'right', width: 90, render: (_, r) => r.closing.total },
    { title: 'Net issued', ...n('netIssued') },
    {
      title: 'Cost of net issued',
      align: 'right',
      width: 140,
      render: (_, r) => formatVnd(r.costNetIssued),
    },
  ];

  const totals = report?.totals;
  return (
    <>
      <Form
        form={form}
        layout="inline"
        initialValues={defaultPeriod()}
        onFinish={run}
        disabled={running}
      >
        <Form.Item name="from" label="From" rules={[{ required: true, message: 'Choose the first day.' }]}>
          <Input type="date" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="to" label="To" rules={[{ required: true, message: 'Choose the last day.' }]}>
          <Input type="date" style={{ width: 160 }} />
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
      </Form>
      {formError && <Typography.Text type="danger">{formError}</Typography.Text>}

      {report && (
        <>
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            Period {report.query.from} – {report.query.to} · produced {dateTime(report.producedAt)} by{' '}
            {report.producedBy.fullName} · sorted by cost of net issued
          </Typography.Paragraph>
          <Table
            rowKey={(r) => r.medicine.id}
            size="small"
            columns={columns}
            dataSource={report.rows}
            pagination={false}
            scroll={{ x: 1500 }}
            locale={{ emptyText: 'No stock or movements in this period.' }}
            onRow={(r) => ({ onClick: () => setOpenRow(r), style: { cursor: 'pointer' } })}
            summary={() =>
              totals && report.rows.length > 0 ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <strong>Total · {report.rows.length} medicines</strong>
                  </Table.Summary.Cell>
                  {(
                    [
                      totals.opening,
                      totals.received,
                      totals.dispensed,
                      totals.sold,
                      totals.returned,
                      totals.released,
                      totals.rejected,
                      totals.writtenOff,
                      totals.destroyed,
                      totals.adjusted,
                      totals.closing.total,
                      totals.netIssued,
                    ] as number[]
                  ).map((value, i) => (
                    <Table.Summary.Cell key={i} index={i + 1} align="right">
                      <strong>{value}</strong>
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell index={13} align="right">
                    <strong>{formatVnd(totals.costNetIssued)}</strong>
                  </Table.Summary.Cell>
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
  const { data, loading } = useLoad(fetchMovements, null);
  const columns: ColumnsType<MovementLine> = [
    { title: 'Time', width: 170, render: (_, m) => dateTime(m.occurredAt) },
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
