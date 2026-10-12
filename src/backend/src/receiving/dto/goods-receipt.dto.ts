import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim, TrimToNull } from '../../common/transforms.js';
import { IsCalendarDate } from '../../common/validation.js';

/** One delivered line (FR-06, FR-07). */
export class GoodsReceiptLineDto {
  @IsUUID('4', { message: 'Choose a medicine.' })
  medicineId: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Batch number is required.' })
  @MaxLength(50)
  batchNumber: string;

  /** Full date; a label with only month and year means its last day (DEC-01). */
  @IsCalendarDate({ message: 'Expiry date must be a date.' })
  expiryDate: string;

  @IsInt({ message: 'Quantity must be a whole number of base units.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  @Max(1_000_000)
  quantity: number;

  /** VND per base unit, at most two decimals. */
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Unit cost must be a number with at most two decimals.' },
  )
  @Min(0, { message: 'Unit cost cannot be negative.' })
  @Max(100_000_000)
  unitCost: number;
}

export class CreateGoodsReceiptDto {
  @IsUUID('4', { message: 'Choose a supplier.' })
  supplierId: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Document number is required.' })
  @MaxLength(50)
  documentNumber: string;

  @IsCalendarDate({ message: 'Receipt date must be a date.' })
  receiptDate: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one line.' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines: GoodsReceiptLineDto[];
}

export class ListGoodsReceiptsQuery {
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;
}
