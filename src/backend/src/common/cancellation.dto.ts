import { Trim } from './transforms.js';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * The reason given when a cart or a hand-over is cancelled before anything
 * was saved (TC-59). Nothing moves; the reason is kept in the audit log so
 * the manager can see who cancelled what and why.
 */
export class CancellationReasonDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Say why it is cancelled.' })
  @MaxLength(500)
  reason: string;
}
