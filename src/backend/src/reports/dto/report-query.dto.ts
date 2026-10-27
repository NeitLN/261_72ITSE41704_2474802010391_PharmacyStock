import { IsOptional, IsUUID } from 'class-validator';
import { IsCalendarDate } from '../../common/validation.js';

/** UC12: both business days included (decision 10). */
export class StockMovementQuery {
  @IsCalendarDate({ message: 'Choose the first day of the period.' })
  from: string;

  @IsCalendarDate({ message: 'Choose the last day of the period.' })
  to: string;

  @IsOptional()
  @IsUUID('4', { message: 'Choose a category.' })
  categoryId?: string;
}

/** UC10 as a report, and UC11's expiry list. */
export class CategoryQuery {
  @IsOptional()
  @IsUUID('4', { message: 'Choose a category.' })
  categoryId?: string;
}
