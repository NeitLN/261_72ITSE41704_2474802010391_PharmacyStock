import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
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
import { PrescriptionStatus } from '../../entities/index.js';

/** One prescribed medicine (FR-13; every field is required by DEC-03). */
export class PrescriptionItemDto {
  @IsUUID('4', { message: 'Choose a medicine.' })
  medicineId: string;

  /** As written on the prescription, e.g. "500 mg". */
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Strength is required.' })
  @MaxLength(50)
  strength: string;

  @IsInt({ message: 'Quantity must be a whole number of base units.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  @Max(100_000)
  quantityPrescribed: number;

  /** e.g. "1 tablet twice a day". */
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Dose is required.' })
  @MaxLength(200)
  dose: string;

  /** e.g. "oral". */
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Route is required.' })
  @MaxLength(50)
  route: string;

  @IsInt({ message: 'Days of use must be a whole number.' })
  @Min(1, { message: 'Days of use must be at least 1.' })
  @Max(365)
  daysOfUse: number;
}

/**
 * Body of `POST /prescriptions` and `PUT /prescriptions/:id` (FR-13, FR-14).
 *
 * The patient is a customer (name, date of birth, address). When the date of
 * birth is unknown, `patientAgeYears` gives the age; a child under 72 months
 * also needs `patientAgeMonths`, `patientWeightKg` and `accompanyingAdult`.
 * Those cross-field rules, the issue date not being in the future and the
 * prescriber being active are checked in the service, which knows the
 * business date. `validUntil` is computed and never sent (BR10).
 */
export class PrescriptionDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Prescription reference is required.' })
  @MaxLength(50)
  referenceNumber: string;

  @IsCalendarDate({ message: 'Issue date must be a date.' })
  issuedDate: string;

  @IsUUID('4', { message: 'Choose the patient.' })
  customerId: string;

  @IsUUID('4', { message: 'Choose the prescriber.' })
  prescriberId: string;

  @IsOptional()
  @IsInt({ message: 'Age must be a whole number of years.' })
  @Min(0)
  @Max(150)
  patientAgeYears?: number | null;

  @IsOptional()
  @IsInt({ message: 'Age in months must be a whole number.' })
  @Min(0)
  @Max(71, { message: 'Age in months is recorded only under 72 months.' })
  patientAgeMonths?: number | null;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Weight must be a number with at most two decimals.' },
  )
  @Min(0.1, { message: 'Weight must be above zero.' })
  @Max(200)
  patientWeightKg?: number | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  accompanyingAdult?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one medicine.' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}

/** Body of `POST /prescriptions/:id/verify` (FR-44). */
export class VerifyPrescriptionDto {
  /** What the pharmacist checked: patient, medicine, strength, dose, directions. */
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

/** Query of `GET /prescriptions`. */
export class ListPrescriptionsQuery {
  /** Matches the reference, the patient's name or code, or the prescriber's name. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(PrescriptionStatus, { message: 'Unknown prescription status.' })
  status?: PrescriptionStatus;
}
