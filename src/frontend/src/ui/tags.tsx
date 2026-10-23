import { ClockCircleOutlined, SafetyOutlined, StopOutlined, WarningOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { expiryInfo } from './expiry';
import { palette } from './theme';
import { type StatusKind, type StatusValue, statusOf, TONE_COLOURS } from './status';

/** A status in its one colour and words, e.g. `<StatusTag kind="batch" value="on_hold" />`. */
export function StatusTag<K extends StatusKind>({ kind, value }: { kind: K; value: StatusValue<K> }) {
  const { tone, label } = statusOf(kind, value);
  return (
    <Tag variant="filled" style={{ ...TONE_COLOURS[tone], marginInlineEnd: 0 }}>
      {label}
    </Tag>
  );
}

export type Classification = 'otc' | 'prescription' | 'controlled';

const CLASSES: Record<Classification, { label: string; color: string; border: string }> = {
  otc: { label: 'OTC', color: palette.success, border: '#b6dcc1' },
  prescription: { label: 'Rx', color: palette.info, border: '#b9cdee' },
  controlled: { label: 'Controlled', color: palette.danger, border: '#f2bcb6' },
};

/** The medicine's class, outlined so it never reads as a status. */
export function ClassTag({ value }: { value: Classification }) {
  const c = CLASSES[value];
  return (
    <Tag
      variant="outlined"
      icon={value === 'controlled' ? <SafetyOutlined /> : undefined}
      style={{ color: c.color, borderColor: c.border, background: '#fff', marginInlineEnd: 0 }}
    >
      {c.label}
    </Tag>
  );
}

/**
 * The expiry of a batch in words with an icon, by tier: expired, within the
 * medicine's alert window, or later. Pass the server's business date.
 */
export function ExpiryText({
  expiryDate,
  businessDate,
  alertDays,
  showDate = true,
}: {
  expiryDate: string;
  businessDate: string;
  alertDays: number;
  showDate?: boolean;
}) {
  const { tier, text } = expiryInfo(expiryDate, businessDate, alertDays);
  const words = showDate && tier !== 'expired' ? `${expiryDate} · ${text}` : text;
  if (tier === 'expired') {
    return (
      <Typography.Text strong style={{ color: palette.danger }}>
        <StopOutlined /> {words}
      </Typography.Text>
    );
  }
  if (tier === 'within_window') {
    return (
      <Typography.Text strong style={{ color: palette.warning }}>
        <WarningOutlined /> {words}
      </Typography.Text>
    );
  }
  return (
    <Typography.Text type="secondary">
      <ClockCircleOutlined /> {words}
    </Typography.Text>
  );
}
