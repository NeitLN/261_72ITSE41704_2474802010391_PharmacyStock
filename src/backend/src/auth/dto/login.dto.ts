import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms.js';

/** FR-38: both fields are required; each error is shown next to its field. */
export class LoginDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter your username.' })
  @MaxLength(100)
  username: string;

  // Not trimmed: spaces may be part of a password.
  @IsString()
  @IsNotEmpty({ message: 'Enter your password.' })
  @MaxLength(200)
  password: string;
}
