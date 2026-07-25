import { NextRequest, NextResponse } from "next/server";
import emailjs from "@emailjs/nodejs";
import { initializeSchema } from "../_lib/schema";
import { isStaffRole } from "../_lib/permissions";
import {
  COOKIE_NAME,
  createSession,
  deleteSessionByToken,
  getSessionUser,
  hashPassword,
  hashToken,
  id,
  now,
  oneTimeCode,
  restoreExpiredSelfExclusion,
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
} from "../_lib/session";
import { getRuntimeEnv } from "../_lib/runtime";
import { attachReferral } from "../_lib/referrals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RuntimeSecrets = { ADMIN_EMAILS?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string; AUTH_PREVIEW_OTP?: string };

async function isAdminEmail(env: unknown, email: string) {
  const configured = ((env as RuntimeSecrets).ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email);
}

function requestContext(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "unknown";
  return { ip, userAgent };
}

async function recordLogin(db: Database, request: NextRequest, email: string, userId: string | null, eventType: string, success: boolean) {
  const context = requestContext(request);
  const recordedAt = now();
  await db.prepare("INSERT INTO login_events (id,user_id,email,event_type,ip_address,user_agent,success,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(id("login"), userId, email, eventType, context.ip, context.userAgent, success ? 1 : 0, recordedAt).run();
  if (!success && eventType === "login") {
    const configuredThreshold = Number(process.env.FRAUD_FAILED_LOGIN_THRESHOLD ?? 5);
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold >= 3 ? configuredThreshold : 5;
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const attempts = await db.prepare("SELECT COUNT(*) AS total FROM login_events WHERE lower(email)=lower(?) AND ip_address=? AND success=0 AND event_type='login' AND created_at>=?").bind(email, context.ip, windowStart).first<{ total: number }>();
    if (Number(attempts?.total ?? 0) >= threshold) {
      const existing = await db.prepare("SELECT id FROM fraud_alerts WHERE alert_type='repeated_login_failures' AND status IN ('open','reviewing') AND created_at>=? AND ((user_id=? ) OR (? IS NULL AND user_id IS NULL)) LIMIT 1").bind(windowStart, userId, userId).first();
      if (!existing) await db.prepare("INSERT INTO fraud_alerts (id,user_id,alert_type,severity,status,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("fraud"), userId, "repeated_login_failures", "high", "open", `${threshold}+ failed sign-in attempts for ${email} from ${context.ip} within 15 minutes.`, recordedAt, recordedAt).run();
    }
  }
  if (success && userId && (eventType === "login" || eventType === "login_2fa_completed" || eventType === "register")) {
    const deviceId = `device_${(await hashToken(`${userId}:${context.userAgent}`)).replace(/[^a-z0-9]/gi, "").slice(0, 22)}`;
    const label = /iphone|ipad/i.test(context.userAgent) ? "Apple mobile device" : /android/i.test(context.userAgent) ? "Android device" : /windows/i.test(context.userAgent) ? "Windows browser" : /macintosh|mac os/i.test(context.userAgent) ? "Mac browser" : "Web browser";
    await db.prepare("INSERT INTO user_devices (id,user_id,label,user_agent,last_ip,trusted,last_seen_at) VALUES (?,?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET last_ip=excluded.last_ip,last_seen_at=excluded.last_seen_at,revoked_at=NULL")
      .bind(deviceId, userId, label, context.userAgent, context.ip, now()).run();
  }
}

async function ensureAccountRecords(db: Database, userId: string) {
  const created = now();
  await db.batch([
    db.prepare("INSERT INTO wallets (user_id,cash_balance,freeplay_balance,referral_balance,reserved_balance,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO NOTHING").bind(userId, 0, 0, 0, 0, created),
    db.prepare("INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,0,0,?) ON CONFLICT(user_id) DO NOTHING").bind(userId, created),
    db.prepare("INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?) ON CONFLICT(user_id) DO NOTHING").bind(userId, created),
  ]);
}

async function sendCode(env: RuntimeSecrets, email: string, code: string, purpose: "password_reset" | "email_verification" | "login_2fa") {
  const preview = env.AUTH_PREVIEW_OTP === "true" || email.endsWith(".test");
  if (preview) return true;
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_AUTH_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error("Email delivery is not configured. Add EMAILJS_SERVICE_ID, EMAILJS_AUTH_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and EMAILJS_PRIVATE_KEY in the Vercel environment settings.");
  }
  const purposeLabel = purpose === "password_reset" ? "Reset your DreamFyre password" : purpose === "login_2fa" ? "Finish signing in to DreamFyre" : "Verify your DreamFyre email";
  emailjs.init({ publicKey, privateKey });
  try {
    await emailjs.send(serviceId, templateId, { to_email: email, code, purpose_label: purposeLabel });
  } catch {
    throw new Error("Email delivery is temporarily unavailable");
  }
  return false;
}

async function createChallenge(db: Database, email: string, userId: string | null, type: "password_reset" | "email_verification" | "login_2fa") {
  const code = oneTimeCode();
  const challengeId = id("otp");
  const created = now();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare("INSERT INTO auth_challenges (id,user_id,email,challenge_type,code_hash,expires_at,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(challengeId, userId, email, type, await hashToken(`${challengeId}:${code}`), expiresAt, created).run();
  return { challengeId, code };
}

export async function GET(request: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    const user = await getSessionUser(request.cookies, env.DB);
    if (!user) return NextResponse.json({ authenticated: false }, { headers: { "cache-control": "no-store" } });
    return NextResponse.json({
      authenticated: true,
      role: user.role,
      email: user.email,
      displayName: user.display_name,
      playerTag: user.player_tag,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: error instanceof Error ? error.message : "Unable to check session" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "register") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const displayNameInput = String(body.displayName ?? "").trim().slice(0, 60);
      const referralInviteCode = String(body.referralCode ?? "").trim().slice(0, 40);
      const ageConfirmed = body.ageConfirmed === true;
      if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
      if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      if (!ageConfirmed) return NextResponse.json({ error: "You must confirm that you meet the legal age requirement" }, { status: 400 });

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
      if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

      const role = (await isAdminEmail(env, email)) ? "super_admin" : "player";
      const userId = id("usr");
      const playerTag = `DFPlayer_${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
      const referralCode = `DF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const displayName = displayNameInput || email.split("@")[0];
      const created = now();
      const passwordHash = await hashPassword(password);

      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id,email,display_name,player_tag,role,status,referral_code,created_at) VALUES (?,?,?,?,?,?,?,?)")
          .bind(userId, email, displayName, playerTag, role, "active", referralCode, created),
        env.DB.prepare("INSERT INTO wallets (user_id,cash_balance,freeplay_balance,referral_balance,reserved_balance,updated_at) VALUES (?,?,?,?,?,?)")
          .bind(userId, 0, 0, 0, 0, created),
        env.DB.prepare("INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)").bind(userId, passwordHash, created),
        env.DB.prepare("INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,1,0,?)").bind(userId, created),
        env.DB.prepare("INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?)").bind(userId, created),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), userId, "account", "Welcome to DreamFyre", "Complete your profile and verify your email before submitting restricted requests.", created),
      ]);
      await attachReferral(env.DB, email, referralInviteCode);

      await recordLogin(env.DB, request, email, userId, "register", true);

      const token = await createSession(env.DB, userId, role);
      const response = NextResponse.json({ message: "Account created", role });
      setSessionCookie(response, request, token);
      return response;
    }

    if (action === "login") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const expectingStaff = body.expectedRole === "staff" || body.expectedRole === "admin";
      const invalid = () => NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

      const user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first<Record<string, string>>();
      if (!user) { await recordLogin(env.DB, request, email, null, "login", false); return invalid(); }
      const credentials = await env.DB.prepare("SELECT password_hash FROM credentials WHERE user_id=?").bind(user.id).first<{ password_hash: string }>();
      if (!credentials || !(await verifyPassword(password, credentials.password_hash))) { await recordLogin(env.DB, request, email, user.id, "login", false); return invalid(); }
      await restoreExpiredSelfExclusion(env.DB, user);
      if (user.status !== "active") return NextResponse.json({ error: "This account is not active or has been suspended. Contact an administrator." }, { status: 403 });
      if ((await isAdminEmail(env, email)) && user.role !== "super_admin") {
        await env.DB.prepare("UPDATE users SET role='super_admin' WHERE id=?").bind(user.id).run();
        user.role = "super_admin";
      }
      if (expectingStaff && !isStaffRole(user.role)) {
        return NextResponse.json({ error: "This account does not have staff portal access." }, { status: 403 });
      }

      const security = await env.DB.prepare("SELECT two_factor_enabled FROM security_settings WHERE user_id=?").bind(user.id).first<{ two_factor_enabled: number }>();
      if (security?.two_factor_enabled) {
        const challenge = await createChallenge(env.DB, email, user.id, "login_2fa");
        const preview = await sendCode(env, email, challenge.code, "login_2fa");
        await recordLogin(env.DB, request, email, user.id, "login_2fa_requested", true);
        return NextResponse.json({ requiresTwoFactor: true, challengeId: challenge.challengeId, role: user.role, message: preview ? "Testing code created." : "A sign-in code was sent to your email.", ...(preview ? { previewCode: challenge.code } : {}) }, { status: 202 });
      }

      const token = await createSession(env.DB, user.id, user.role);
      await ensureAccountRecords(env.DB, user.id);
      await recordLogin(env.DB, request, email, user.id, "login", true);
      const response = NextResponse.json({ message: "Signed in", role: user.role });
      setSessionCookie(response, request, token);
      return response;
    }

    if (action === "verify_login_2fa") {
      const challengeId = String(body.challengeId ?? "");
      const code = String(body.code ?? "").trim();
      const challenge = await env.DB.prepare("SELECT * FROM auth_challenges WHERE id=? AND challenge_type='login_2fa'").bind(challengeId).first<Record<string, string | number>>();
      if (!challenge || challenge.used_at || String(challenge.expires_at) < now()) return NextResponse.json({ error: "This sign-in code expired. Start again." }, { status: 400 });
      if (Number(challenge.attempts) >= 5) return NextResponse.json({ error: "Too many attempts. Start sign-in again." }, { status: 429 });
      if ((await hashToken(`${challengeId}:${code}`)) !== challenge.code_hash) {
        await env.DB.prepare("UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?").bind(challengeId).run();
        return NextResponse.json({ error: "The sign-in code is incorrect" }, { status: 400 });
      }
      const user = await env.DB.prepare("SELECT * FROM users WHERE id=? AND status='active'").bind(String(challenge.user_id)).first<Record<string, string>>();
      if (!user) return NextResponse.json({ error: "Account is unavailable" }, { status: 403 });
      await env.DB.prepare("UPDATE auth_challenges SET used_at=? WHERE id=?").bind(now(), challengeId).run();
      const token = await createSession(env.DB, user.id, user.role);
      await recordLogin(env.DB, request, user.email, user.id, "login_2fa_completed", true);
      const response = NextResponse.json({ message: "Signed in", role: user.role });
      setSessionCookie(response, request, token);
      return response;
    }

    if (action === "logout") {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (token) await deleteSessionByToken(env.DB, token);
      const response = NextResponse.json({ message: "Signed out" });
      clearSessionCookie(response, request);
      return response;
    }

    if (action === "forgot_password") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
      const user = await env.DB.prepare("SELECT id FROM users WHERE email=? AND status='active'").bind(email).first<{ id: string }>();
      if (!user) return NextResponse.json({ message: "If that account exists, a security code has been sent." });
      const challenge = await createChallenge(env.DB, email, user.id, "password_reset");
      const preview = await sendCode(env, email, challenge.code, "password_reset");
      await recordLogin(env.DB, request, email, user.id, "password_reset_requested", true);
      return NextResponse.json({ message: preview ? "Testing code created." : "Check your email for the six-digit code.", challengeId: challenge.challengeId, ...(preview ? { previewCode: challenge.code } : {}) });
    }

    if (action === "reset_password") {
      const challengeId = String(body.challengeId ?? "");
      const code = String(body.code ?? "").trim();
      const password = String(body.password ?? "");
      if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      const challenge = await env.DB.prepare("SELECT * FROM auth_challenges WHERE id=? AND challenge_type='password_reset'").bind(challengeId).first<Record<string, string | number>>();
      if (!challenge || challenge.used_at || String(challenge.expires_at) < now()) return NextResponse.json({ error: "This code has expired. Request a new one." }, { status: 400 });
      if (Number(challenge.attempts) >= 5) return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
      if ((await hashToken(`${challengeId}:${code}`)) !== challenge.code_hash) {
        await env.DB.prepare("UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?").bind(challengeId).run();
        return NextResponse.json({ error: "The security code is incorrect" }, { status: 400 });
      }
      const passwordHash = await hashPassword(password);
      await env.DB.batch([
        env.DB.prepare("UPDATE credentials SET password_hash=? WHERE user_id=?").bind(passwordHash, String(challenge.user_id)),
        env.DB.prepare("UPDATE auth_challenges SET used_at=? WHERE id=?").bind(now(), challengeId),
        env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(String(challenge.user_id)),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), String(challenge.user_id), "security", "Password changed", "Your DreamFyre portal password was reset. All previous sessions were signed out.", now()),
      ]);
      await recordLogin(env.DB, request, String(challenge.email), String(challenge.user_id), "password_reset_completed", true);
      return NextResponse.json({ message: "Password reset. You can sign in now." });
    }

    if (action === "request_email_verification") {
      const user = await getSessionUser(request.cookies, env.DB);
      if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
      const profile = await env.DB.prepare("SELECT email_verified FROM user_profiles WHERE user_id=?").bind(user.id).first<{ email_verified: number }>();
      if (profile?.email_verified) return NextResponse.json({ message: "Email is already verified." });
      const challenge = await createChallenge(env.DB, user.email, user.id, "email_verification");
      const preview = await sendCode(env, user.email, challenge.code, "email_verification");
      return NextResponse.json({ message: preview ? "Testing code created." : "Verification code sent.", challengeId: challenge.challengeId, ...(preview ? { previewCode: challenge.code } : {}) });
    }

    if (action === "verify_email") {
      const user = await getSessionUser(request.cookies, env.DB);
      if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
      const challengeId = String(body.challengeId ?? "");
      const code = String(body.code ?? "").trim();
      const challenge = await env.DB.prepare("SELECT * FROM auth_challenges WHERE id=? AND user_id=? AND challenge_type='email_verification'").bind(challengeId, user.id).first<Record<string, string | number>>();
      if (!challenge || challenge.used_at || String(challenge.expires_at) < now()) return NextResponse.json({ error: "This verification code has expired" }, { status: 400 });
      if ((await hashToken(`${challengeId}:${code}`)) !== challenge.code_hash) return NextResponse.json({ error: "The verification code is incorrect" }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("UPDATE user_profiles SET email_verified=1,updated_at=? WHERE user_id=?").bind(now(), user.id),
        env.DB.prepare("UPDATE auth_challenges SET used_at=? WHERE id=?").bind(now(), challengeId),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), user.id, "account", "Email verified", "Your email address is now verified.", now()),
      ]);
      return NextResponse.json({ message: "Email verified successfully." });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 });
  }
}
