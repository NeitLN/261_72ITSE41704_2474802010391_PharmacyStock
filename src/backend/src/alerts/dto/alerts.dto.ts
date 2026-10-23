import { IsIn, IsOptional } from 'class-validator';
import { AlertType } from '../../entities/index.js';

export const ALERT_LIST_STATUSES = ['unresolved', 'resolved', 'all'] as const;
const ALERT_TYPES = [
  AlertType.LOW_STOCK,
  AlertType.OUT_OF_STOCK,
  AlertType.EXPIRING_SOON,
  AlertType.EXPIRED,
] as const;

/** Query of `GET /alerts` (UC10 A2; UC11 adds the expiry types). */
export class ListAlertsQuery {
  @IsOptional()
  @IsIn(ALERT_LIST_STATUSES, {
    message: `Status must be one of: ${ALERT_LIST_STATUSES.join(', ')}.`,
  })
  status?: (typeof ALERT_LIST_STATUSES)[number];

  @IsOptional()
  @IsIn(ALERT_TYPES, {
    message: `Type must be one of: ${ALERT_TYPES.join(', ')}.`,
  })
  type?: (typeof ALERT_TYPES)[number];
}
