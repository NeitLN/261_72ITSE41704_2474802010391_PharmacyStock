import bcrypt from 'bcryptjs';

/** bcrypt work factor (NFR-05: cost ≥ 10). */
export const BCRYPT_COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/** False for a wrong password and for a stored value that is not a bcrypt hash. */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Compared against when the username does not exist, so a failed sign-in
 * takes about as long whether or not the account exists (FR-38).
 */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword('no account has this password');
  return dummyHash;
}
