import { IsDefined, IsInt, Max, Min } from 'class-validator';
import { IsCalendarDate } from '../../common/validation.js';

/** UC13: a price that starts on a date of today or later. */
export class SchedulePriceDto {
  @IsDefined({ message: 'Price is required.' })
  @IsInt({ message: 'Price must be a whole number of VND.' })
  @Min(1, { message: 'Price must be positive.' })
  @Max(100_000_000)
  unitPrice: number;

  @IsDefined({ message: 'Choose the date the price starts.' })
  @IsCalendarDate({ message: 'The start date must be a date.' })
  effectiveFrom: string;
}
