import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { QueryBoolean, Trim, TrimToNull } from '../../common/transforms.js';
import { MedicineClassification } from '../../entities/index.js';

/** Codes are stored upper-case so "para500" and "PARA500" are the same code. */
const UpperTrim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

const CODE = /^[A-Z0-9][A-Z0-9-]*$/;
const MAX_PRICE = 100_000_000;

/** FR-01, FR-03: a medicine and its current selling price. */
export class CreateMedicineDto {
  @UpperTrim()
  @IsString()
  @IsNotEmpty({ message: 'Code is required.' })
  @MaxLength(30)
  @Matches(CODE, {
    message: 'Code may contain only letters, digits and dashes.',
  })
  code: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(200)
  name: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  activeIngredient?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  strength?: string | null;

  @IsUUID('4', { message: 'Choose a category.' })
  categoryId: string;

  @IsUUID('4', { message: 'Choose a base unit.' })
  baseUnitId: string;

  /** Defaults to PRESCRIPTION (DEC-09). */
  @IsOptional()
  @IsEnum(MedicineClassification, {
    message: 'Classification must be otc, prescription or controlled.',
  })
  classification?: MedicineClassification;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  classificationSource?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsISO8601(
    { strict: true },
    { message: 'Classification date must be a date.' },
  )
  classificationDate?: string | null;

  @IsOptional()
  @IsInt({ message: 'Reorder level must be a whole number.' })
  @Min(0, { message: 'Reorder level cannot be negative.' })
  @Max(1_000_000)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  lowStockMonitored?: boolean;

  @IsOptional()
  @IsInt({ message: 'Alert window must be a whole number of days.' })
  @Min(0, { message: 'Alert window cannot be negative.' })
  @Max(3650)
  expiryAlertDays?: number;

  /** VND per base unit; a positive whole number (FR-03). */
  @IsInt({ message: 'Price must be a whole number of VND.' })
  @Min(1, { message: 'Price must be positive.' })
  @Max(MAX_PRICE)
  currentPrice: number;
}

/** Every field optional; `currentPrice` sets a new price from today. */
export class UpdateMedicineDto {
  @IsOptional()
  @UpperTrim()
  @IsString()
  @IsNotEmpty({ message: 'Code is required.' })
  @MaxLength(30)
  @Matches(CODE, {
    message: 'Code may contain only letters, digits and dashes.',
  })
  code?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  activeIngredient?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  strength?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'Choose a category.' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Choose a base unit.' })
  baseUnitId?: string;

  @IsOptional()
  @IsEnum(MedicineClassification, {
    message: 'Classification must be otc, prescription or controlled.',
  })
  classification?: MedicineClassification;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  classificationSource?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsISO8601(
    { strict: true },
    { message: 'Classification date must be a date.' },
  )
  classificationDate?: string | null;

  @IsOptional()
  @IsInt({ message: 'Reorder level must be a whole number.' })
  @Min(0, { message: 'Reorder level cannot be negative.' })
  @Max(1_000_000)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  lowStockMonitored?: boolean;

  @IsOptional()
  @IsInt({ message: 'Alert window must be a whole number of days.' })
  @Min(0, { message: 'Alert window cannot be negative.' })
  @Max(3650)
  expiryAlertDays?: number;

  @IsOptional()
  @IsInt({ message: 'Price must be a whole number of VND.' })
  @Min(1, { message: 'Price must be positive.' })
  @Max(MAX_PRICE)
  currentPrice?: number;
}

export class ListMedicinesQuery {
  /** Matches code, name or active ingredient. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  includeInactive?: boolean;
}
