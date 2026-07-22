import { NextRequest, NextResponse } from "next/server";
import { isStaffRole } from "./permissions";

type DatabaseLike = Pick<Database, "prepare">;

type CookieReader = { get: (name: string) => { value: string } | undefined };

export const COOKIE_NAME = "df_session";
const PLAYER_SESSION_DAYS = 30;
const STAFF_SESSION_HOURS = 12;
// A portable PBKDF2 work factor supported by the Node.js Web Crypto runtime.
const PBKDF2_ITERATIONS = 100000;

export const now = () => new Date().toISOString();
export const id = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function sha256Base64(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

export async function hashToken(value: string) {
  return sha256Base64(value);
}

export function oneTimeCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, keyMaterial, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !saltB64 || !hashB64) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: base64ToBytes(saltB64), iterations, hash: "SHA-256" }, keyMaterial, 256);
  return timingSafeEqual(bytesToBase64(new Uint8Array(bits)), hashB64);
}

// Staff sessions expire sooner than player sessions (doc §14: "secure sessions... session timeout").
export async function createSession(db: DatabaseLike, userId: string, role: string): Promise<string> {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Base64(token);
  const durationMs = isStaffRole(role)
    ? STAFF_SESSION_HOURS * 60 * 60 * 1000
    : PLAYER_SESSION_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();
  await db.prepare("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)").bind(tokenHash, userId, expiresAt, now()).run();
  return token;
}

export async function deleteSessionByToken(db: DatabaseLike, token: string) {
  const tokenHash = await sha256Base64(token);
  await db.prepare("DELETE FROM sessions WHERE id=?").bind(tokenHash).run();
}

// Used for staff offboarding / suspension: immediately signs the user out everywhere.
export async function revokeAllSessions(db: DatabaseLike, userId: string) {
  await db.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId).run();
}

export async function restoreExpiredSelfExclusion(db: DatabaseLike, user: Record<string, string>) {
  if (user.status !== "self_excluded") return user;
  const security = await db.prepare("SELECT self_excluded_until FROM security_settings WHERE user_id=?").bind(user.id).first<{ self_excluded_until: string | null }>();
  if (!security?.self_excluded_until || security.self_excluded_until > now()) return user;
  await db.prepare("UPDATE users SET status='active' WHERE id=? AND status='self_excluded'").bind(user.id).run();
  await db.prepare("UPDATE security_settings SET self_excluded_until=NULL,updated_at=? WHERE user_id=?").bind(now(), user.id).run();
  user.status = "active";
  return user;
}

export async function getSessionUser(cookies: CookieReader, db: DatabaseLike): Promise<Record<string, string> | null> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = await sha256Base64(token);
  const session = await db.prepare("SELECT user_id, expires_at FROM sessions WHERE id=?").bind(tokenHash).first<{ user_id: string; expires_at: string }>();
  if (!session || session.expires_at < now()) return null;
  const user = await db.prepare("SELECT * FROM users WHERE id=?").bind(session.user_id).first<Record<string, string>>();
  if (!user) return null;
  await restoreExpiredSelfExclusion(db, user);
  if (user.status !== "active") return null;
  return user;
}

export function setSessionCookie(response: NextResponse, request: NextRequest, token: string) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProtocol === "https" || request.nextUrl.protocol === "https:";
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: PLAYER_SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse, request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProtocol === "https" || request.nextUrl.protocol === "https:";
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  });
}
