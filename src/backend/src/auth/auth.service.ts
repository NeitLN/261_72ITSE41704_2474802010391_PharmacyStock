import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Unauthenticated } from '../common/errors.js';
import { User } from '../entities/index.js';
import { type Actor, toActor } from './actor.js';
import { SESSION_SECONDS } from './auth-config.js';
import { dummyPasswordHash, verifyPassword } from './passwords.js';

/** What the client keeps after signing in (UC16). */
export interface SessionView {
  accessToken: string;
  expiresAt: string;
  user: ActorView;
}

export interface ActorView {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

interface TokenPayload {
  sub: string;
}

/** One message for an unknown username and a wrong password (FR-38). */
const BAD_CREDENTIALS = 'Incorrect username or password.';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * UC16 sign-in. The password is checked before the account's state, so
   * "locked" is only ever shown to someone who knows the password (FR-40).
   */
  async login(username: string, password: string): Promise<SessionView> {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .getOne();

    if (!user) {
      await verifyPassword(password, await dummyPasswordHash());
      throw new Unauthenticated(BAD_CREDENTIALS);
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new Unauthenticated(BAD_CREDENTIALS);
    }
    if (!user.isActive) {
      throw new Unauthenticated('This account is locked. Ask the manager.');
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });

    const payload: TokenPayload = { sub: user.id };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: SESSION_SECONDS,
    });
    return {
      accessToken,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
      user: AuthService.view(toActor(user)),
    };
  }

  /**
   * The Actor behind a session token. The user is read again on every
   * request, so a locked account or a changed role applies at once.
   */
  async actorFromToken(token: string): Promise<Actor> {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new Unauthenticated(
        'Your session has expired. Please sign in again.',
      );
    }
    const user = await this.users.findOne({
      where: { id: payload.sub, isActive: true },
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new Unauthenticated(
        'Your session has ended. Please sign in again.',
      );
    }
    return toActor(user);
  }

  static view(actor: Actor): ActorView {
    return {
      id: actor.id,
      username: actor.username,
      fullName: actor.fullName,
      role: actor.role,
      permissions: [...actor.permissions].sort(),
    };
  }
}
