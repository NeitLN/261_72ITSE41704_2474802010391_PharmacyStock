import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { QueryBoolean, Trim } from '../../common/transforms.js';

/** Stock-state filter of the medicine list (UC04 decisions). */
export const STOCK_STATES = [
  'all',
  'in_stock',
  'out_of_stock',
  'has_expired',
] as const;
export type StockState = (typeof STOCK_STATES)[number];

/** Query of `GET /stock` (UC04 steps 1–2). */
export class StockQuery {
  /** Matches code, name or active ingredient, any case. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Choose a category.' })
  categoryId?: string;

  @IsOptional()
  @IsIn(STOCK_STATES, {
    message: `State must be one of: ${STOCK_STATES.join(', ')}.`,
  })
  state?: StockState;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be a whole number.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page size must be a whole number.' })
  @Min(1, { message: 'Page size must be at least 1.' })
  @Max(100, { message: 'Page size must be at most 100.' })
  pageSize?: number;
}
