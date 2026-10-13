import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { QueryBoolean, Trim, TrimToNull } from '../../common/transforms.js';
import { IfSent } from '../../common/validation.js';

/** FR-15: licence number and full name are mandatory. */
export class CreatePrescriberDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Licence number is required.' })
  @MaxLength(50)
  licenceNumber: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  clinicName?: string | null;
}

/** Every field optional; a field left out is not changed, "" clears clinic. */
export class UpdatePrescriberDto {
  @IfSent()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Licence number is required.' })
  @MaxLength(50)
  licenceNumber?: string;

  @IfSent()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  clinicName?: string | null;
}

export class ListPrescribersQuery {
  /** Matches full name, licence number or clinic name. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  /**
   * When sent, filters by the active flag; when left out, only active
   * prescribers are listed (same default as the suppliers list).
   */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  active?: boolean;
}
