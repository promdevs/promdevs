import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
export const cookieName = "promdevs_session";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export function isPasswordHash(value: string) {
  return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(value);
}

export async function verifyPassword(password: string, encoded: string) {
  if (!isPasswordHash(encoded)) return false;
  const [, salt, expected] = encoded.split("$");
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export class Sessions {
  private entries = new Map<string, { email: string; expiresAt: number }>();
  readonly maxAge = 8 * 60 * 60;
  private key(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
  private sweep(now: number) {
    for (const [key, value] of this.entries)
      if (value.expiresAt <= now) this.entries.delete(key);
  }
  create(email: string, now = Date.now()) {
    this.sweep(now);
    if (this.entries.size >= 1000) throw new Error("Session capacity reached");
    const token = randomBytes(32).toString("hex");
    this.entries.set(this.key(token), {
      email,
      expiresAt: now + this.maxAge * 1000,
    });
    return token;
  }
  get(token: string, now = Date.now()) {
    this.sweep(now);
    return this.entries.get(this.key(token)) ?? null;
  }
  remove(token: string) {
    this.entries.delete(this.key(token));
  }
  cookie(token: string, secure: boolean, clear = false) {
    return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${clear ? 0 : this.maxAge}${secure ? "; Secure" : ""}`;
  }
}

export function sessionToken(cookie: string | undefined) {
  return (
    cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1) ?? ""
  );
}
