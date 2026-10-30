import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { AuditService } from '../audit/audit.service.js';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { RoleCode } from '../auth/permissions.js';
import { IfSent, IsCalendarDate, UuidParam } from '../common/validation.js';
import { UsersService } from './users.service.js';

const ROLE_CODES = Object.values(RoleCode);

/** Not trimmed: spaces may be part of a password. 72 is bcrypt's limit. */
class PasswordFields {
  @IsString({ message: 'Enter a password.' })
  @Length(8, 72, { message: 'A password has 8 to 72 characters.' })
  password: string;

  @IsString({ message: 'Repeat the password.' })
  passwordConfirm: string;
}

export class CreateUserDto extends PasswordFields {
  @IsString({ message: 'Enter a username.' })
  @Matches(/^[A-Za-z0-9._-]{3,32}$/, {
    message: 'A username has 3 to 32 letters, digits, dots, dashes or underscores.',
  })
  username: string;

  @IsString({ message: 'Enter the full name.' })
  @Length(2, 100, { message: 'Enter the full name (2 to 100 characters).' })
  fullName: string;

  @IsIn(ROLE_CODES, { message: `Choose a role: ${ROLE_CODES.join(', ')}.` })
  roleCode: string;
}

export class UpdateUserDto {
  @IfSent()
  @IsString()
  @Length(2, 100, { message: 'Enter the full name (2 to 100 characters).' })
  fullName?: string;

  @IfSent()
  @IsIn(ROLE_CODES, { message: `Choose a role: ${ROLE_CODES.join(', ')}.` })
  roleCode?: string;

  @IfSent()
  @IsBoolean({ message: 'Say whether the account is active.' })
  isActive?: boolean;
}

export class ResetPasswordDto extends PasswordFields {}

export class RolePermissionsDto {
  @IsArray({ message: 'List the permissions.' })
  @IsString({ each: true })
  permissions: string[];
}

export class AuditQueryDto {
  @IsOptional()
  @IsCalendarDate({ message: 'Choose the first day.' })
  from?: string;

  @IsOptional()
  @IsCalendarDate({ message: 'Choose the last day.' })
  to?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Choose a user.' })
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  page?: number;
}

/** UC15 users (FR-40). */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.users.list(actor);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Patch(':id')
  update(@CurrentUser() actor: Actor, @UuidParam() id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(actor, id, dto);
  }

  @Post(':id/password')
  @HttpCode(204)
  async resetPassword(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    await this.users.resetPassword(actor, id, dto.password, dto.passwordConfirm);
  }
}

/** UC15 what each role may do. */
@Controller('roles')
export class RolesController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.users.roles(actor);
  }

  @Put(':code/permissions')
  setPermissions(
    @CurrentUser() actor: Actor,
    @Param('code') code: string,
    @Body() dto: RolePermissionsDto,
  ) {
    return this.users.setRolePermissions(actor, code, dto.permissions);
  }
}

/** UC15 the audit log (FR-41). */
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: AuditQueryDto) {
    return this.audit.list(actor, query);
  }
}
