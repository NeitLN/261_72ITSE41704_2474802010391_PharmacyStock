import { PermissionDenied } from '../common/errors.js';
import type { Permission, RoleCode } from './permissions.js';

/**
 * The signed-in user as the business layer sees it. Controllers obtain it
 * with `@CurrentUser()` and pass it to every service method that reads or
 * changes data; the service checks the permission itself (FR-39), so a call
 * sent straight to the API is checked exactly like one from the UI.
 *
 * Whatever authenticates the request (the temporary DevAuthGuard now, the JWT
 * guard of UC16 later) must produce this shape.
 */
export interface Actor {
  id: string;
  username: string;
  fullName: string;
  role: RoleCode;
  permissions: ReadonlySet<string>;
}

/** Throws PermissionDenied unless the actor's role grants `permission`. */
export function assertPermission(actor: Actor, permission: Permission): void {
  if (!actor.permissions.has(permission)) {
    throw new PermissionDenied(permission);
  }
}
