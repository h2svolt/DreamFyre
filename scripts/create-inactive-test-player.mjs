// Creates a full player account (or reuses an existing one by email) and
// backdates its login history so it qualifies as inactive for the win-back
// email query - useful for testing the real (non-?test=) cron detection
// logic without waiting for actual player inactivity.
//
// Usage:
//   PLAYER_EMAIL=you@example.com PLAYER_NAME="Test Player" INACTIVE_DAYS=4 \
//     node --env-file=.env.local scripts/create-inactive-test-player.mjs
//
// INACTIVE_DAYS defaults to 4 (past the 3-day win-back threshold).
// If PLAYER_EMAIL already exists, only the backdating step runs.

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const email = process.env.PLAYER_EMAIL?.trim().toLowerCase();
const displayName = process.env.PLAYER_NAME?.trim() || email?.split("@")[0];
const inactiveDays = Number(process.env.INACTIVE_DAYS ?? 4);

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Set PLAYER_EMAIL to a real, deliverable email address (not a .test/.example domain).");
  process.exit(1);
}
if (!Number.isFinite(inactiveDays) || inactiveDays < 1) {
  console.error("INACTIVE_DAYS must be a positive number.");
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

const backdated = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

const existing = await client.execute({ sql: "SELECT id FROM users WHERE email=?", args: [email] });

let userId;
if (existing.rows.length > 0) {
  userId = existing.rows[0].id;
  console.log(`User already exists (${userId}) - skipping account creation, just backdating.`);
} else {
  userId = `usr_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const playerTag = `DFPlayer_${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
  const referralCode = `DF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const randomPassword = crypto.randomUUID();
  const passwordHash = await hashPassword(randomPassword);

  await client.batch(
    [
      { sql: "INSERT INTO users (id,email,display_name,player_tag,role,status,referral_code,created_at) VALUES (?,?,?,?,?,?,?,?)", args: [userId, email, displayName, playerTag, "player", "active", referralCode, backdated] },
      { sql: "INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)", args: [userId, passwordHash, backdated] },
      { sql: "INSERT INTO wallets (user_id,cash_balance,freeplay_balance,referral_balance,reserved_balance,updated_at) VALUES (?,?,?,?,?,?)", args: [userId, 0, 0, 0, 0, backdated] },
      { sql: "INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,1,1,?)", args: [userId, backdated] },
      { sql: "INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?)", args: [userId, backdated] },
    ],
    "write",
  );
  console.log(`Created player: ${email} (id: ${userId})`);
}

// Remove any newer successful login/register events so the win-back query's
// COALESCE(MAX(login_events), users.created_at) actually resolves to the
// backdated timestamp, not something more recent.
await client.execute({ sql: "DELETE FROM login_events WHERE user_id=? AND success=1 AND event_type IN ('login','register','login_2fa_completed')", args: [userId] });
await client.execute({
  sql: "INSERT INTO login_events (id,user_id,email,event_type,ip_address,user_agent,success,created_at) VALUES (?,?,?,?,?,?,?,?)",
  args: [`login_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`, userId, email, "register", null, null, 1, backdated],
});

// Clear any prior win-back tracking so this account is eligible again.
await client.execute({ sql: "DELETE FROM winback_emails WHERE user_id=?", args: [userId] });

console.log(`Backdated to ${inactiveDays} day(s) inactive (last activity: ${backdated}). Ready for the win-back cron to pick up.`);
