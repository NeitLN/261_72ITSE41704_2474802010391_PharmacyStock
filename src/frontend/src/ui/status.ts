import { palette } from './theme';

/** What a status means, which sets its colour (ui-design.md §5). */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'quarantine' | 'neutral';

export const TONE_COLOURS: Record<Tone, { color: string; background: string }> = {
  success: { color: palette.success, background: palette.successBg },
  warning: { color: palette.warning, background: palette.warningBg },
  danger: { color: palette.danger, background: palette.dangerBg },
  info: { color: palette.info, background: palette.infoBg },
  quarantine: { color: palette.quarantine, background: palette.quarantineBg },
  neutral: { color: palette.neutral, background: palette.neutralBg },
};

/**
 * Every status the screens show, in one map, so a status has the same colour
 * and words everywhere. Colour is never the only signal: the label is text.
 */
export const STATUSES = {
  record: {
    active: { tone: 'success', label: 'Active' },
    inactive: { tone: 'neutral', label: 'Inactive' },
  },
  batch: {
    active: { tone: 'success', label: 'Active' },
    expired: { tone: 'danger', label: 'Expired' },
    on_hold: { tone: 'warning', label: 'On hold' },
    recalled: { tone: 'danger', label: 'Recalled' },
    rejected: { tone: 'neutral', label: 'Rejected' },
  },
  prescription: {
    received: { tone: 'neutral', label: 'Received' },
    verified: { tone: 'info', label: 'Verified' },
    partially_dispensed: { tone: 'warning', label: 'Partially dispensed' },
    fully_dispensed: { tone: 'success', label: 'Fully dispensed' },
    cancelled: { tone: 'danger', label: 'Cancelled' },
  },
  stockAlert: {
    low_stock: { tone: 'warning', label: 'Low stock' },
    out_of_stock: { tone: 'danger', label: 'Out of stock' },
  },
  returnAssessment: {
    pending_assessment: { tone: 'quarantine', label: 'Pending assessment' },
    released: { tone: 'success', label: 'Released' },
    rejected: { tone: 'neutral', label: 'Rejected' },
  },
} as const satisfies Record<string, Record<string, { tone: Tone; label: string }>>;

export type StatusKind = keyof typeof STATUSES;
export type StatusValue<K extends StatusKind> = keyof (typeof STATUSES)[K];

export function statusOf<K extends StatusKind>(
  kind: K,
  value: StatusValue<K>,
): { tone: Tone; label: string } {
  return (STATUSES[kind] as Record<string, { tone: Tone; label: string }>)[value as string];
}
