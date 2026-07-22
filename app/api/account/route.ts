import { NextRequest, NextResponse } from "next/server";
import { getRuntimeEnv } from "../_lib/runtime";
import { initializeSchema, seedGames } from "../_lib/schema";
import { getSessionUser, hashPassword, id, now, revokeAllSessions, verifyPassword } from "../_lib/session";
import { isStaffRole } from "../_lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function player(request: NextRequest) {
  const env = await getRuntimeEnv();
  await initializeSchema(env.DB);
  await seedGames(env.DB);
  const user = await getSessionUser(request.cookies, env.DB);
  if (!user || isStaffRole(user.role)) return null;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,0,0,?) ON CONFLICT(user_id) DO NOTHING").bind(user.id, now()),
    env.DB.prepare("INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?) ON CONFLICT(user_id) DO NOTHING").bind(user.id, now()),
  ]);
  return { env, user };
}

export async function GET(request: NextRequest) {
  try {
    const current = await player(request);
    if (!current) return NextResponse.json({ error: "Player access required" }, { status: 401 });
    const { env, user } = current;
    const [profile, security, verification, notifications, promotions, claims, loginHistory, devices, gameActivity] = await Promise.all([
      env.DB.prepare("SELECT avatar_url AS avatarUrl,phone,date_of_birth AS dateOfBirth,country,region,address,age_confirmed AS ageConfirmed,email_verified AS emailVerified,contact_preferences AS contactPreferences,updated_at AS updatedAt FROM user_profiles WHERE user_id=?").bind(user.id).first(),
      env.DB.prepare("SELECT two_factor_enabled AS twoFactorEnabled,deposit_limit AS depositLimit,self_excluded_until AS selfExcludedUntil,suspension_requested AS suspensionRequested,updated_at AS updatedAt FROM security_settings WHERE user_id=?").bind(user.id).first(),
      env.DB.prepare("SELECT id,verification_type AS verificationType,status,document_type AS documentType,reference,note,created_at AS createdAt,updated_at AS updatedAt FROM verification_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 20").bind(user.id).all(),
      env.DB.prepare("SELECT id,notification_type AS notificationType,title,message,read_at AS readAt,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 80").bind(user.id).all(),
      env.DB.prepare("SELECT id,code,title,description,reward_type AS rewardType,reward_amount AS rewardAmount,status,starts_at AS startsAt,ends_at AS endsAt,wager_requirement AS wagerRequirement FROM promotions WHERE status='active' ORDER BY created_at DESC").all(),
      env.DB.prepare("SELECT c.id,c.promotion_id AS promotionId,c.status,c.wager_progress AS wagerProgress,c.claimed_at AS claimedAt,p.title FROM promotion_claims c JOIN promotions p ON p.id=c.promotion_id WHERE c.user_id=? ORDER BY c.claimed_at DESC").bind(user.id).all(),
      env.DB.prepare("SELECT id,event_type AS eventType,ip_address AS ipAddress,user_agent AS userAgent,success,created_at AS createdAt FROM login_events WHERE user_id=? ORDER BY created_at DESC LIMIT 25").bind(user.id).all(),
      env.DB.prepare("SELECT id,label,user_agent AS userAgent,last_ip AS lastIp,trusted,last_seen_at AS lastSeenAt,revoked_at AS revokedAt FROM user_devices WHERE user_id=? ORDER BY last_seen_at DESC").bind(user.id).all(),
      env.DB.prepare("SELECT a.id,a.game_id AS gameId,g.name AS gameName,a.event_type AS eventType,a.result,a.amount,a.session_reference AS sessionReference,a.created_at AS createdAt FROM game_activity a JOIN games g ON g.id=a.game_id WHERE a.user_id=? ORDER BY a.created_at DESC LIMIT 50").bind(user.id).all(),
    ]);
    return NextResponse.json({
      user: { displayName: user.display_name, email: user.email, playerTag: user.player_tag, status: user.status },
      profile, security, verification: verification.results, notifications: notifications.results,
      promotions: promotions.results, promotionClaims: claims.results, loginHistory: loginHistory.results,
      devices: devices.results, gameActivity: gameActivity.results,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Account centre unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await player(request);
    if (!current) return NextResponse.json({ error: "Player access required" }, { status: 401 });
    const { env, user } = current;
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "update_profile") {
      const displayName = String(body.displayName ?? "").trim().slice(0, 60);
      const email = String(body.email ?? user.email).trim().toLowerCase().slice(0, 160);
      const playerTag = String(body.playerTag ?? user.player_tag).trim().slice(0, 24);
      const currentPassword = String(body.currentPassword ?? "");
      const phone = String(body.phone ?? "").trim().slice(0, 30);
      const dateOfBirth = String(body.dateOfBirth ?? "").trim().slice(0, 10);
      const country = String(body.country ?? "").trim().slice(0, 80);
      const region = String(body.region ?? "").trim().slice(0, 80);
      const address = String(body.address ?? "").trim().slice(0, 240);
      const ageConfirmed = body.ageConfirmed === true ? 1 : 0;
      if (!displayName) return NextResponse.json({ error: "Display name is required" }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email or Gmail address" }, { status: 400 });
      if (!/^[A-Za-z0-9_]{4,24}$/.test(playerTag)) return NextResponse.json({ error: "Username must be 4–24 letters, numbers or underscores" }, { status: 400 });
      if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return NextResponse.json({ error: "Enter a valid date of birth" }, { status: 400 });
      const emailChanged = email !== user.email.toLowerCase();
      const playerTagChanged = playerTag.toLowerCase() !== user.player_tag.toLowerCase();
      if (emailChanged || playerTagChanged) {
        const credential = await env.DB.prepare("SELECT password_hash FROM credentials WHERE user_id=?").bind(user.id).first<{ password_hash: string }>();
        if (!credential) return NextResponse.json({ error: "Contact support to change the email or username on a social-login account" }, { status: 400 });
        if (!currentPassword || !(await verifyPassword(currentPassword, credential.password_hash))) return NextResponse.json({ error: "Enter your current password to change your email or username" }, { status: 400 });
      }
      if (emailChanged && await env.DB.prepare("SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND id<>?").bind(email, user.id).first()) return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
      if (playerTagChanged && await env.DB.prepare("SELECT id FROM users WHERE LOWER(player_tag)=LOWER(?) AND id<>?").bind(playerTag, user.id).first()) return NextResponse.json({ error: "That username is already in use" }, { status: 409 });
      const updated = now();
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET display_name=?,email=?,player_tag=? WHERE id=?").bind(displayName, email, playerTag, user.id),
        env.DB.prepare("UPDATE user_profiles SET phone=?,date_of_birth=?,country=?,region=?,address=?,age_confirmed=?,email_verified=CASE WHEN ? THEN 0 ELSE email_verified END,updated_at=? WHERE user_id=?").bind(phone || null, dateOfBirth || null, country || null, region || null, address || null, ageConfirmed, emailChanged ? 1 : 0, updated, user.id),
        ...(emailChanged ? [env.DB.prepare("UPDATE referrals SET referred_email=? WHERE LOWER(referred_email)=LOWER(?) AND status='registered'").bind(email, user.email)] : []),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), user.id, "profile_updated", "user", user.id, JSON.stringify({ country, region, ageConfirmed: Boolean(ageConfirmed), emailChanged, playerTagChanged }), updated),
      ]);
      if (emailChanged) {
        await revokeAllSessions(env.DB, user.id);
        return NextResponse.json({ message: "Email updated. Sign in again and verify the new address.", signedOut: true });
      }
      return NextResponse.json({ message: "Profile updated." });
    }

    if (action === "change_password") {
      const currentPassword = String(body.currentPassword ?? "");
      const newPassword = String(body.newPassword ?? "");
      if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      const credential = await env.DB.prepare("SELECT password_hash FROM credentials WHERE user_id=?").bind(user.id).first<{ password_hash: string }>();
      if (!credential || !(await verifyPassword(currentPassword, credential.password_hash))) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("UPDATE credentials SET password_hash=? WHERE user_id=?").bind(await hashPassword(newPassword), user.id),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), user.id, "security", "Password changed", "Your portal password was changed. Sign in again on your devices.", now()),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), user.id, "portal_password_changed", "user", user.id, null, now()),
      ]);
      await revokeAllSessions(env.DB, user.id);
      return NextResponse.json({ message: "Password changed. Please sign in again.", signedOut: true });
    }

    if (action === "request_verification") {
      const verificationType = String(body.verificationType ?? "identity");
      if (!['identity','location','age'].includes(verificationType)) return NextResponse.json({ error: "Unknown verification type" }, { status: 400 });
      const existing = await env.DB.prepare("SELECT id FROM verification_requests WHERE user_id=? AND verification_type=? AND status IN ('pending','in_review')").bind(user.id, verificationType).first();
      if (existing) return NextResponse.json({ error: "This verification is already being reviewed" }, { status: 409 });
      const requestId = id("verify"); const created = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO verification_requests (id,user_id,verification_type,status,document_type,reference,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(requestId, user.id, verificationType, "pending", String(body.documentType ?? "").slice(0, 60) || null, String(body.reference ?? "").slice(0, 160) || null, String(body.note ?? "").slice(0, 500) || null, created, created),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), user.id, "verification", "Verification submitted", `Your ${verificationType} verification is waiting for review.`, created),
      ]);
      return NextResponse.json({ message: "Verification request submitted.", requestId });
    }

    if (action === "set_responsible_gaming") {
      const depositLimitInput = body.depositLimit === null || body.depositLimit === "" ? null : Number(body.depositLimit);
      if (depositLimitInput !== null && (!Number.isFinite(depositLimitInput) || depositLimitInput < 0)) return NextResponse.json({ error: "Deposit limit must be zero or more" }, { status: 400 });
      await env.DB.prepare("UPDATE security_settings SET deposit_limit=?,updated_at=? WHERE user_id=?").bind(depositLimitInput, now(), user.id).run();
      return NextResponse.json({ message: "Responsible-gaming limit saved." });
    }

    if (action === "self_exclude") {
      const days = Number(body.days);
      if (![1, 7, 30, 180, 365].includes(days)) return NextResponse.json({ error: "Choose a supported self-exclusion period" }, { status: 400 });
      const until = new Date(Date.now() + days * 86400000).toISOString();
      await env.DB.batch([
        env.DB.prepare("UPDATE security_settings SET self_excluded_until=?,updated_at=? WHERE user_id=?").bind(until, now(), user.id),
        env.DB.prepare("UPDATE users SET status='self_excluded' WHERE id=?").bind(user.id),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), user.id, "self_exclusion_started", "user", user.id, JSON.stringify({ until }), now()),
      ]);
      await revokeAllSessions(env.DB, user.id);
      return NextResponse.json({ message: "Self-exclusion started. You have been signed out.", signedOut: true });
    }

    if (action === "request_suspension") {
      await env.DB.batch([
        env.DB.prepare("UPDATE security_settings SET suspension_requested=1,updated_at=? WHERE user_id=?").bind(now(), user.id),
        env.DB.prepare("UPDATE users SET status='suspension_requested' WHERE id=?").bind(user.id),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), user.id, "account_suspension_requested", "user", user.id, null, now()),
      ]);
      await revokeAllSessions(env.DB, user.id);
      return NextResponse.json({ message: "Account suspension requested. You have been signed out.", signedOut: true });
    }

    if (action === "set_two_factor") {
      const enabled = body.enabled === true;
      const currentPassword = String(body.currentPassword ?? "");
      const profile = await env.DB.prepare("SELECT email_verified FROM user_profiles WHERE user_id=?").bind(user.id).first<{ email_verified: number }>();
      if (enabled && !profile?.email_verified) return NextResponse.json({ error: "Verify your email before enabling two-factor authentication" }, { status: 400 });
      const credential = await env.DB.prepare("SELECT password_hash FROM credentials WHERE user_id=?").bind(user.id).first<{ password_hash: string }>();
      if (!credential || !(await verifyPassword(currentPassword, credential.password_hash))) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      await env.DB.prepare("UPDATE security_settings SET two_factor_enabled=?,updated_at=? WHERE user_id=?").bind(enabled ? 1 : 0, now(), user.id).run();
      return NextResponse.json({ message: enabled ? "Email two-factor authentication enabled." : "Two-factor authentication disabled." });
    }

    if (action === "read_notification") {
      await env.DB.prepare("UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?").bind(now(), String(body.notificationId ?? ""), user.id).run();
      return NextResponse.json({ message: "Notification marked as read." });
    }

    if (action === "claim_promotion") {
      const code = String(body.code ?? "").trim().toUpperCase();
      const promotionId = String(body.promotionId ?? "");
      const promotion = code
        ? await env.DB.prepare("SELECT * FROM promotions WHERE UPPER(code)=? AND status='active'").bind(code).first<Record<string, string | number>>()
        : await env.DB.prepare("SELECT * FROM promotions WHERE id=? AND status='active'").bind(promotionId).first<Record<string, string | number>>();
      if (!promotion) return NextResponse.json({ error: "Promotion is not active or the code is invalid" }, { status: 404 });
      if ((promotion.starts_at && String(promotion.starts_at) > now()) || (promotion.ends_at && String(promotion.ends_at) < now())) return NextResponse.json({ error: "This promotion is outside its active period" }, { status: 400 });
      if (await env.DB.prepare("SELECT id FROM promotion_claims WHERE user_id=? AND promotion_id=?").bind(user.id, String(promotion.id)).first()) return NextResponse.json({ error: "You already claimed this promotion" }, { status: 409 });
      const amount = Number(promotion.reward_amount); const created = now();
      const walletColumn = promotion.reward_type === "cash" ? "cash_balance" : "freeplay_balance";
      await env.DB.batch([
        env.DB.prepare("INSERT INTO promotion_claims (id,user_id,promotion_id,status,wager_progress,claimed_at) VALUES (?,?,?,?,0,?)").bind(id("claim"), user.id, String(promotion.id), Number(promotion.wager_requirement) > 0 ? "wagering" : "completed", created),
        env.DB.prepare(`UPDATE wallets SET ${walletColumn}=${walletColumn}+?,updated_at=? WHERE user_id=?`).bind(amount, created, user.id),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"), user.id, "bonus", amount, walletColumn === "cash_balance" ? "USD" : "FP", "completed", String(promotion.title), created),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), user.id, "promotion", "Promotion claimed", `${promotion.title} was added to your ${walletColumn === "cash_balance" ? "cash" : "FreePlay"} balance.`, created),
      ]);
      return NextResponse.json({ message: `${promotion.title} claimed.` });
    }

    if (action === "create_support_ticket") {
      const subject = String(body.subject ?? "").trim().slice(0, 120);
      const category = String(body.category ?? "general").trim().slice(0, 40);
      const message = String(body.message ?? "").trim().slice(0, 1500);
      if (!subject || !message) return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
      const ticketId = id("ticket"); const created = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO support_tickets (id,user_id,subject,category,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(ticketId, user.id, subject, category, category === "security" ? "high" : "normal", "open", created, created),
        env.DB.prepare("INSERT INTO support_messages (id,user_id,sender_role,channel,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("msg"), user.id, "player", `ticket:${ticketId}`, message, created),
      ]);
      return NextResponse.json({ message: "Support ticket created.", ticketId });
    }

    if (action === "revoke_device") {
      const deviceId = String(body.deviceId ?? "");
      await env.DB.prepare("UPDATE user_devices SET revoked_at=? WHERE id=? AND user_id=?").bind(now(), deviceId, user.id).run();
      await revokeAllSessions(env.DB, user.id);
      return NextResponse.json({ message: "Device revoked. Sign in again on trusted devices.", signedOut: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Account request failed" }, { status: 500 });
  }
}
