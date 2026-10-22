import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim, TrimToNull } from '../../common/transforms.js';
import { StockTakeStatus } from '../../entities/index.js';

/** UC09 step 1: the medicines to count (FR-29). */
export class OpenStockTakeDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one medicine to count.' })
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true, message: 'Choose a medicine.' })
  medicineIds: string[];

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

/** UC09 step 3: what was found on the shelf for one line. */
export class CountLineDto {
  @IsInt({ message: 'Counted quantity must be a whole number.' })
  @Min(0, { message: 'Counted quantity cannot be negative.' })
  @Max(1_000_000)
  countedQuantity: number;

  /** Required at submit when counted and system quantities differ (FR-30). */
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

/** UC09 A3: a batch of these medicines that the sheet does not list. */
export class AddLineDto {
  @IsUUID('4', { message: 'Choose a batch.' })
  batchId: string;
}

/** UC09 A5: why the manager sends the counts back. */
export class ReturnStockTakeDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Say what should be recounted.' })
  @MaxLength(500)
  comment: string;
}

export class ListStockTakesQuery {
  @IsOptional()
  @IsEnum(StockTakeStatus, {
    message: `Status must be one of: ${Object.values(StockTakeStatus).join(', ')}.`,
  })
  status?: StockTakeStatus;
}
