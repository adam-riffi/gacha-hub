import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scryptKey = (password: string, salt: Buffer, keyLength: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolvePromise, rejectPromise) => scrypt(password, salt, keyLength, options, (error, key) => (error ? rejectPromise(error) : resolvePromise(key))));

/**
 * The owner password (ADR 0010) as `OWNER_PASSWORD_HASH` keeps it: `scrypt$<cost>$<salt>$<key>`, base64, from Node's own
 * scrypt. The password itself is never stored anywhere.
 */
export class OwnerPassword {
  /** scrypt's cost (N), a power of two: 2^15 takes about 50 ms a try. */
  static readonly COST = 2 ** 15;
  private static readonly KEY_LENGTH = 64;
  private static readonly BLOCK_SIZE = 8;

  /** scrypt's settings for a cost, with the memory it needs (128 × N × r bytes) allowed twice over. */
  private static options(cost: number): ScryptOptions {
    return { N: cost, r: OwnerPassword.BLOCK_SIZE, p: 1, maxmem: 2 * 128 * cost * OwnerPassword.BLOCK_SIZE };
  }

  /** A new hash of the password, salted. */
  static async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scryptKey(password, salt, OwnerPassword.KEY_LENGTH, OwnerPassword.options(OwnerPassword.COST));
    return `scrypt$${OwnerPassword.COST}$${salt.toString("base64")}$${key.toString("base64")}`;
  }

  /** Whether the password is the one hashed; a malformed hash matches nothing. */
  static async matches(password: string, stored: string): Promise<boolean> {
    const [scheme, costText, saltText, keyText] = stored.split("$");
    const cost = Number(costText);
    const isPowerOfTwo = Number.isInteger(cost) && cost >= 2 ** 10 && cost <= 2 ** 20 && (cost & (cost - 1)) === 0;
    if (scheme !== "scrypt" || !isPowerOfTwo || !saltText || !keyText || !password) return false;
    const expected = Buffer.from(keyText, "base64");
    if (expected.length !== OwnerPassword.KEY_LENGTH) return false;
    const key = await scryptKey(password, Buffer.from(saltText, "base64"), expected.length, OwnerPassword.options(cost));
    return timingSafeEqual(key, expected);
  }
}
