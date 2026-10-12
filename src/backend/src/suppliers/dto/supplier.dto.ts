import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { QueryBoolean, Trim, TrimToNull } from '../../common/transforms.js';
import { IfSent } from '../../common/validation.js';

/** Digits with optional spaces, dots or dashes and a leading +; 8–20 characters. */
const PHONE = /^\+?\d[\d .-]{6,18}\d$/;
const PHONE_MESSAGE =
  'Phone number must be 8–20 characters: digits, spaces, dots, dashes and an optional leading +.';

/** FR-05: name and phone number are mandatory. */
export class CreateSupplierDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(200)
  name: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(PHONE, { message: PHONE_MESSAGE })
  phone: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  contactPerson?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsEmail({}, { message: 'E-mail address is not valid.' })
  @MaxLength(200)
  email?: string | null;
}

/** Every field optional; a field left out is not changed, "" clears an optional one. */
export class UpdateSupplierDto {
  @IfSent()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(200)
  name?: string;

  @IfSent()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(PHONE, { message: PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  contactPerson?: string | null;

  @IsOptional()
  @TrimToNull()
  @IsEmail({}, { message: 'E-mail address is not valid.' })
  @MaxLength(200)
  email?: string | null;
}

export class ListSuppliersQuery {
  /** Matches name or phone number. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  includeInactive?: boolean;
}
