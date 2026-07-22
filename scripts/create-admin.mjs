// Creates a super_admin user directly in the Turso/libSQL database, matching
// the exact record shape and PBKDF2 password hash format the app itself uses
// (see app/api/_lib/session.ts hashPassword / app/api/auth/route.ts register).
//
// Usage (values never get typed into chat or shell history if you use a var file):
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password node --env-file=.env.local scripts/create-admin.mjs
//
// Optional: ADMIN_DISPLAY_NAME (defaults to the email's local part)

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || email?.split("@")[0];

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Set ADMIN_EMAIL to a valid email address.");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("Set ADMIN_PASSWORD to a password with at least 8 characters.");
  process.exit(1);
}

const PBKDF2_ITERATIONS = 100000;

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return Buffer.from(binary, "binary").toString("base64");
}

async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, keyMaterial, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

const client = createClient({ url, authToken });

const existing = await client.execute({ sql: "SELECT id FROM users WHERE email=?", args: [email] });
if (existing.rows.length > 0) {
  console.error(`A user with email ${email} already exists. Aborting — use the app's password reset flow instead of overwriting.`);
  process.exit(1);
}

const userId = `usr_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
const playerTag = `DFPlayer_${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
const referralCode = `DF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const created = new Date().toISOString();
const passwordHash = await hashPassword(password);

await client.batch(
  [
    {
      sql: "INSERT INTO users (id,email,display_name,player_tag,role,status,referral_code,created_at) VALUES (?,?,?,?,?,?,?,?)",
      args: [userId, email, displayName, playerTag, "super_admin", "active", referralCode, created],
    },
    {
      sql: "INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)",
      args: [userId, passwordHash, created],
    },
    {
      sql: "INSERT INTO wallets (user_id,cash_balance,freeplay_balance,referral_balance,reserved_balance,updated_at) VALUES (?,?,?,?,?,?)",
      args: [userId, 0, 0, 0, 0, created],
    },
    {
      sql: "INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,1,1,?)",
      args: [userId, created],
    },
    {
      sql: "INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?)",
      args: [userId, created],
    },
  ],
  "write",
);

console.log(`Created super_admin user: ${email} (id: ${userId})`);
