import { IsIn, IsOptional } from 'class-validator';
import { AlertType } from '../../entities/index.js';

export const ALERT_LIST_STATUSES = ['unresolved', 'resolved', 'all'] as const;
const LEVEL_TYPES = [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK] as const;

/** Query of `GET /alerts` (UC10 A2). */
export class ListAlertsQuery {
  @IsOptional()
  @IsIn(ALERT_LIST_STATUSES, {
    message: `Status must be one of: ${ALERT_LIST_STATUSES.join(', ')}.`,
  })
  status?: (typeof ALERT_LIST_STATUSES)[number];

  @IsOptional()
  @IsIn(LEVEL_TYPES, {
    message: `Type must be one of: ${LEVEL_TYPES.join(', ')}.`,
  })
  type?: (typeof LEVEL_TYPES)[number];
}
