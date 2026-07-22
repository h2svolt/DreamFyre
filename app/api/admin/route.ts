import { NextRequest, NextResponse } from "next/server";
import { initializeSchema, seedGames } from "../_lib/schema";
import { getSessionUser, now, id, revokeAllSessions, hashPassword } from "../_lib/session";
import { ASSIGNABLE_STAFF_ROLES, hasPermission, isStaffRole } from "../_lib/permissions";
import { getRuntimeEnv } from "../_lib/runtime";
import { qualifyReferral } from "../_lib/referrals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RuntimeSecrets = { GAME_CREDENTIAL_ENCRYPTION_KEY?: string };

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function credentialKey(env: unknown) {
  const encoded = (env as RuntimeSecrets).GAME_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Game credential encryption is not configured");
  const raw = base64ToBytes(encoded);
  if (raw.byteLength !== 32) throw new Error("Game credential encryption key is invalid");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptCredential(env: unknown, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await credentialKey(env), new TextEncoder().encode(value));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function currentStaff(request: NextRequest) {
  const env = await getRuntimeEnv();
  const user = await getSessionUser(request.cookies, env.DB);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    await seedGames(env.DB);
    const user = await currentStaff(request);
    if (!user) return NextResponse.json({ error: "Staff access required" }, { status: 401 });

    const [counts, volume, gameReady] = await Promise.all([
      env.DB.prepare("SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM users WHERE role='player' AND status='active') AS activeUsers,(SELECT COUNT(*) FROM game_requests WHERE request_type='credit' AND status NOT IN ('completed','rejected')) AS pendingDeposits,(SELECT COUNT(*) FROM withdrawals WHERE status NOT IN ('completed','rejected')) AS pendingWithdrawals,(SELECT COUNT(*) FROM game_requests WHERE status NOT IN ('completed','rejected')) AS pendingGameRequests,(SELECT COUNT(*) FROM referrals WHERE status='qualified') AS qualifiedReferrals,(SELECT COALESCE(SUM(reward),0) FROM referrals WHERE status='qualified') AS referralRewards").first<Record<string, number>>(),
      env.DB.prepare("SELECT COALESCE(SUM(ABS(amount)),0) AS total FROM transactions").first<{ total: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM games WHERE api_status='staff_processed'").first<{ total: number }>(),
    ]);

    const [gameQueue, withdrawalQueue, games, supportMessages, verificationQueue, tickets, staffUsers, paymentMethods, supportChannels, promotions, banners, cmsPages, fraudAlerts, auditLogs, revenueReport] = await Promise.all([
      hasPermission(user.role, "process_game_requests")
        ? env.DB.prepare("SELECT r.id,r.request_type AS requestType,r.game_id AS gameId,g.name AS gameName,r.amount,r.game_username AS gameUsername,r.status,r.staff_note AS staffNote,r.provider_reference AS providerReference,r.transaction_id AS transactionId,r.created_at AS createdAt,r.updated_at AS updatedAt,u.player_tag AS playerTag,u.email FROM game_requests r JOIN games g ON g.id=r.game_id JOIN users u ON u.id=r.user_id WHERE r.status NOT IN ('completed','rejected') ORDER BY r.created_at ASC LIMIT 100").all()
        : Promise.resolve({ results: [] }),
      hasPermission(user.role, "process_withdrawals")
        ? env.DB.prepare("SELECT w.id,w.amount,w.method,w.destination_masked AS destinationMasked,w.status,w.created_at AS createdAt,u.player_tag AS playerTag,u.email FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.status NOT IN ('completed','rejected') ORDER BY w.created_at ASC LIMIT 100").all()
        : Promise.resolve({ results: [] }),
      env.DB.prepare("SELECT g.id,g.name,g.short_name AS shortName,g.accent,g.api_status AS apiStatus,l.launch_url AS launchUrl,p.admin_url AS adminUrl FROM games g LEFT JOIN game_launch_links l ON l.game_id=g.id LEFT JOIN game_provider_links p ON p.game_id=g.id WHERE g.enabled = 1 ORDER BY g.name").all(),
      env.DB.prepare("SELECT m.id,m.user_id AS userId,m.sender_role AS senderRole,m.channel,m.message,m.created_at AS createdAt,u.display_name AS displayName,u.player_tag AS playerTag,u.email FROM support_messages m JOIN users u ON u.id=m.user_id WHERE u.role='player' ORDER BY m.created_at DESC LIMIT 300").all(),
      hasPermission(user.role, "manage_verification") ? env.DB.prepare("SELECT v.id,v.user_id AS userId,v.verification_type AS verificationType,v.status,v.document_type AS documentType,v.reference,v.note,v.created_at AS createdAt,v.updated_at AS updatedAt,u.display_name AS displayName,u.player_tag AS playerTag,u.email FROM verification_requests v JOIN users u ON u.id=v.user_id WHERE v.status IN ('pending','in_review') ORDER BY v.created_at ASC LIMIT 100").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_support") ? env.DB.prepare("SELECT t.id,t.user_id AS userId,t.subject,t.category,t.priority,t.status,t.assigned_to AS assignedTo,t.created_at AS createdAt,t.updated_at AS updatedAt,u.display_name AS displayName,u.player_tag AS playerTag,u.email FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.status NOT IN ('closed','resolved') ORDER BY CASE t.priority WHEN 'high' THEN 0 ELSE 1 END,t.updated_at DESC LIMIT 100").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_staff") ? env.DB.prepare("SELECT id,email,display_name AS displayName,player_tag AS playerTag,role,status,created_at AS createdAt FROM users WHERE role<>'player' ORDER BY created_at DESC LIMIT 100").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_payments") ? env.DB.prepare("SELECT m.id,m.name,m.method_type AS methodType,m.network,m.instructions,m.destination,m.enabled,l.payment_url AS paymentUrl,CASE WHEN m.id='chime' THEN '/assets/payments/chime-isaiah-santiago.png' ELSE NULL END AS qrImageUrl,m.updated_at AS updatedAt FROM payment_method_configs m LEFT JOIN payment_method_links l ON l.method_id=m.id ORDER BY m.name").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_platform") ? env.DB.prepare("SELECT id,label,channel_type AS channelType,destination,enabled,updated_at AS updatedAt FROM support_channel_configs ORDER BY CASE id WHEN 'gmail' THEN 1 WHEN 'facebook' THEN 2 WHEN 'instagram' THEN 3 WHEN 'whatsapp' THEN 4 ELSE 5 END").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_content") ? env.DB.prepare("SELECT id,code,title,description,reward_type AS rewardType,reward_amount AS rewardAmount,status,starts_at AS startsAt,ends_at AS endsAt,wager_requirement AS wagerRequirement,updated_at AS updatedAt FROM promotions ORDER BY created_at DESC").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_content") ? env.DB.prepare("SELECT id,title,message,cta_label AS ctaLabel,cta_url AS ctaUrl,image_url AS imageUrl,status,starts_at AS startsAt,ends_at AS endsAt,updated_at AS updatedAt FROM promotional_banners ORDER BY created_at DESC").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "manage_content") ? env.DB.prepare("SELECT slug,title,body,status,updated_at AS updatedAt FROM cms_pages ORDER BY slug").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "view_audit_log") ? env.DB.prepare("SELECT f.id,f.user_id AS userId,f.alert_type AS alertType,f.severity,f.status,f.description,f.created_at AS createdAt,u.email FROM fraud_alerts f LEFT JOIN users u ON u.id=f.user_id WHERE f.status<>'resolved' ORDER BY f.created_at DESC LIMIT 100").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "view_audit_log") ? env.DB.prepare("SELECT a.id,a.actor_id AS actorId,a.action,a.entity_type AS entityType,a.entity_id AS entityId,a.metadata,a.created_at AS createdAt,u.email AS actorEmail FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 150").all() : Promise.resolve({ results: [] }),
      hasPermission(user.role, "view_audit_log") ? env.DB.prepare("SELECT substr(created_at,1,10) AS day,COALESCE(SUM(CASE WHEN type='deposit' AND status='completed' THEN amount ELSE 0 END),0) AS deposits,ABS(COALESCE(SUM(CASE WHEN type='withdrawal' AND status='completed' THEN amount ELSE 0 END),0)) AS withdrawals,COALESCE(SUM(CASE WHEN type IN ('bonus','reward') THEN amount ELSE 0 END),0) AS bonuses,COUNT(*) AS transactions FROM transactions GROUP BY substr(created_at,1,10) ORDER BY day DESC LIMIT 30").all() : Promise.resolve({ results: [] }),
    ]);

    return NextResponse.json({
      role: user.role,
      permissions: {
        processGameRequests: hasPermission(user.role, "process_game_requests"),
        processWithdrawals: hasPermission(user.role, "process_withdrawals"),
        manageStaff: hasPermission(user.role, "manage_staff"),
        manageUsers: hasPermission(user.role, "manage_users"),
        manageVerification: hasPermission(user.role, "manage_verification"),
        managePayments: hasPermission(user.role, "manage_payments"),
        manageContent: hasPermission(user.role, "manage_content"),
        manageSupport: hasPermission(user.role, "manage_support"),
        managePlatform: hasPermission(user.role, "manage_platform"),
        viewAuditLog: hasPermission(user.role, "view_audit_log"),
      },
      metrics: {
        users: counts?.users ?? 0,
        activeUsers: counts?.activeUsers ?? 0,
        pendingDeposits: counts?.pendingDeposits ?? 0,
        pendingWithdrawals: counts?.pendingWithdrawals ?? 0,
        pendingGameRequests: counts?.pendingGameRequests ?? 0,
        transactionVolume: volume?.total ?? 0,
        gameProvidersAvailable: gameReady?.total ?? 0,
        qualifiedReferrals: counts?.qualifiedReferrals ?? 0,
        referralRewards: counts?.referralRewards ?? 0,
      },
      gameQueue: gameQueue.results,
      withdrawalQueue: withdrawalQueue.results,
      games: games.results,
      supportMessages: supportMessages.results,
      verificationQueue: verificationQueue.results,
      tickets: tickets.results,
      staffUsers: staffUsers.results,
      paymentMethods: paymentMethods.results,
      supportChannels: supportChannels.results,
      promotions: promotions.results,
      banners: banners.results,
      cmsPages: cmsPages.results,
      fraudAlerts: fraudAlerts.results,
      auditLogs: auditLogs.results,
      revenueReport: revenueReport.results,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Staff portal unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    const user = await currentStaff(request);
    if (!user) return NextResponse.json({ error: "Staff access required" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const actorId = user.id;

    if (action === "staff_reply_support") {
      const targetUserId = String(body.userId ?? "");
      const message = String(body.message ?? "").trim().slice(0, 1000);
      if (!message) return NextResponse.json({ error: "Write a reply first" }, { status: 400 });
      const player = await env.DB.prepare("SELECT id,display_name FROM users WHERE id=? AND role='player' AND status='active'").bind(targetUserId).first<{ id: string; display_name: string }>();
      if (!player) return NextResponse.json({ error: "Active player not found" }, { status: 404 });
      await env.DB.batch([
        env.DB.prepare("INSERT INTO support_messages (id,user_id,sender_role,channel,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("msg"), targetUserId, user.role, "staff_portal", message, now()),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),targetUserId,"support","New support reply",message.slice(0,240),now()),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_replied_to_player", "user", targetUserId, JSON.stringify({ channel: "staff_portal" }), now()),
      ]);
      return NextResponse.json({ message: `Reply sent to ${player.display_name}.` });
    }

    if (action === "staff_update_game_request") {
      if (!hasPermission(user.role, "process_game_requests")) return NextResponse.json({ error: "Game-operations access required" }, { status: 403 });
      const requestId = String(body.requestId ?? ""); const nextStatus = String(body.status ?? "");
      const staffNote = String(body.staffNote ?? "").trim().slice(0, 500); const gameUsername = String(body.gameUsername ?? "").trim().slice(0, 80); const providerReference = String(body.providerReference ?? "").trim().slice(0, 120); const temporaryPassword = String(body.temporaryPassword ?? "");
      if (!["processing", "completed", "rejected"].includes(nextStatus)) return NextResponse.json({ error: "Invalid request status" }, { status: 400 });
      const gameRequest = await env.DB.prepare("SELECT r.*,g.name AS game_name FROM game_requests r JOIN games g ON g.id=r.game_id WHERE r.id=?").bind(requestId).first<Record<string, string | number>>();
      if (!gameRequest) return NextResponse.json({ error: "Game request not found" }, { status: 404 });
      if (["completed", "rejected"].includes(String(gameRequest.status))) return NextResponse.json({ error: "This request is already closed" }, { status: 409 });
      const updated = now();
      if (nextStatus === "processing") {
        await env.DB.batch([
          env.DB.prepare("UPDATE game_requests SET status='processing',game_username=COALESCE(NULLIF(?,''),game_username),staff_note=?,provider_reference=?,updated_at=? WHERE id=?").bind(gameUsername, staffNote || null, providerReference || null, updated, requestId),
          ...(gameRequest.transaction_id ? [env.DB.prepare("UPDATE transactions SET status='staff_processing' WHERE id=?").bind(String(gameRequest.transaction_id))] : []),
          env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_started_game_request", "game_request", requestId, JSON.stringify({ gameUsername, providerReference }), updated),
        ]);
        return NextResponse.json({ message: `${gameRequest.game_name} request moved to processing.` });
      }
      if (nextStatus === "rejected") {
        await env.DB.batch([
          env.DB.prepare("UPDATE game_requests SET status='rejected',staff_note=?,updated_at=? WHERE id=?").bind(staffNote || "Rejected by staff", updated, requestId),
          ...(gameRequest.transaction_id ? [env.DB.prepare("UPDATE transactions SET status='rejected' WHERE id=?").bind(String(gameRequest.transaction_id))] : []),
          env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(gameRequest.user_id),"game",`${gameRequest.game_name} request needs attention`,staffNote||"The request could not be completed. Contact support for help.",updated),
          env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_rejected_game_request", "game_request", requestId, JSON.stringify({ staffNote }), updated),
        ]);
        return NextResponse.json({ message: `${gameRequest.game_name} request rejected.` });
      }
      if (gameRequest.request_type === "account") {
        if (!gameUsername || temporaryPassword.length < 6) return NextResponse.json({ error: "Enter the provider Game ID and a password of at least 6 characters" }, { status: 400 });
        const encryptedPassword = await encryptCredential(env, temporaryPassword); const accountId = id("gacct");
        await env.DB.batch([
          env.DB.prepare("INSERT INTO game_accounts (id,user_id,game_id,username,encrypted_password,status,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(accountId, String(gameRequest.user_id), String(gameRequest.game_id), gameUsername, encryptedPassword, "active", updated),
          env.DB.prepare("INSERT INTO game_account_metadata (account_id,balance,launch_url,balance_updated_at) VALUES (?,?,NULL,?) ON CONFLICT(account_id) DO UPDATE SET balance_updated_at=excluded.balance_updated_at").bind(accountId, 0, updated),
          env.DB.prepare("UPDATE game_requests SET status='completed',game_username=?,staff_note=?,provider_reference=?,updated_at=? WHERE id=?").bind(gameUsername, staffNote || "Account ready", providerReference || null, updated, requestId),
          env.DB.prepare("INSERT INTO support_messages (id,user_id,sender_role,channel,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("msg"), String(gameRequest.user_id), user.role, "game_account", `${gameRequest.game_name} is ready. Your Game ID is ${gameUsername}. Reveal the encrypted password from the My Games card.`, updated),
          env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(gameRequest.user_id),"game",`${gameRequest.game_name} is ready`,`Your Game ID and password are now available in My Games.`,updated),
          env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_completed_account_request", "game_request", requestId, JSON.stringify({ accountId, gameUsername, providerReference }), updated),
        ]);
      } else if (gameRequest.request_type === "password_reset") {
        if (temporaryPassword.length < 6) return NextResponse.json({ error: "Enter the new provider password" }, { status: 400 });
        const account = await env.DB.prepare("SELECT id,username FROM game_accounts WHERE user_id=? AND game_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(String(gameRequest.user_id), String(gameRequest.game_id)).first<{ id: string; username: string }>();
        if (!account) return NextResponse.json({ error: "Active game account not found" }, { status: 404 });
        const encryptedPassword = await encryptCredential(env, temporaryPassword);
        await env.DB.batch([
          env.DB.prepare("UPDATE game_accounts SET encrypted_password=? WHERE id=?").bind(encryptedPassword, account.id),
          env.DB.prepare("UPDATE game_requests SET status='completed',game_username=?,staff_note=?,provider_reference=?,updated_at=? WHERE id=?").bind(account.username, staffNote || "Password reset completed by support", providerReference || null, updated, requestId),
          env.DB.prepare("INSERT INTO support_messages (id,user_id,sender_role,channel,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("msg"), String(gameRequest.user_id), "support", "password_reset", `${gameRequest.game_name} password reset is complete. Reveal the updated password from your connected account card.`, updated),
          env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(gameRequest.user_id),"security",`${gameRequest.game_name} password updated`,`Reveal the new password from your connected game card.`,updated),
          env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_completed_password_reset", "game_account", account.id, JSON.stringify({ requestId }), updated),
        ]);
      } else if (gameRequest.request_type === "credit_withdrawal") {
        const account = await env.DB.prepare("SELECT a.id,a.username,COALESCE(m.balance,0) AS balance FROM game_accounts a LEFT JOIN game_account_metadata m ON m.account_id=a.id WHERE a.user_id=? AND a.game_id=? AND a.status='active' ORDER BY a.created_at DESC LIMIT 1").bind(String(gameRequest.user_id), String(gameRequest.game_id)).first<{ id: string; username: string; balance: number }>();
        if (!account || Number(account.balance) < Number(gameRequest.amount) || !providerReference) return NextResponse.json({ error: "Verify the account balance and enter the provider reference" }, { status: 400 });
        await env.DB.batch([
          env.DB.prepare("INSERT INTO game_account_metadata (account_id,balance,launch_url,balance_updated_at) VALUES (?,?,NULL,?) ON CONFLICT(account_id) DO UPDATE SET balance=MAX(0,balance-?),balance_updated_at=excluded.balance_updated_at").bind(account.id, 0, updated, Number(gameRequest.amount)),
          env.DB.prepare("UPDATE wallets SET cash_balance=cash_balance+?,updated_at=? WHERE user_id=?").bind(Number(gameRequest.amount), updated, String(gameRequest.user_id)),
          env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,game_id,description,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id("tx"), String(gameRequest.user_id), "game_redeem", Number(gameRequest.amount), "USD", "completed", String(gameRequest.game_id), `${gameRequest.game_name} credits redeemed`, updated),
          env.DB.prepare("UPDATE game_requests SET status='completed',game_username=?,staff_note=?,provider_reference=?,updated_at=? WHERE id=?").bind(account.username, staffNote || "Game credits moved to portal cash balance", providerReference, updated, requestId),
          env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(gameRequest.user_id),"wallet",`${gameRequest.game_name} credits withdrawn`,`${Number(gameRequest.amount).toFixed(2)} was moved to your DreamFyre cash balance.`,updated),
          env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_completed_game_credit_withdrawal", "game_request", requestId, JSON.stringify({ accountId: account.id, amount: gameRequest.amount, providerReference }), updated),
        ]);
      } else {
        const resolvedUsername = gameUsername || String(gameRequest.game_username ?? "");
        if (!resolvedUsername || !providerReference) return NextResponse.json({ error: "Enter the credited game username and provider reference" }, { status: 400 });
        const account = await env.DB.prepare("SELECT id FROM game_accounts WHERE user_id=? AND game_id=? AND username=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(String(gameRequest.user_id), String(gameRequest.game_id), resolvedUsername).first<{ id: string }>();
        await env.DB.batch([
          env.DB.prepare("UPDATE game_requests SET status='completed',game_username=?,staff_note=?,provider_reference=?,updated_at=? WHERE id=?").bind(resolvedUsername, staffNote || "Credits loaded by staff", providerReference, updated, requestId),
          ...(gameRequest.transaction_id ? [env.DB.prepare("UPDATE transactions SET status='completed' WHERE id=?").bind(String(gameRequest.transaction_id))] : []),
          ...(account ? [env.DB.prepare("INSERT INTO game_account_metadata (account_id,balance,launch_url,balance_updated_at) VALUES (?,?,NULL,?) ON CONFLICT(account_id) DO UPDATE SET balance=balance+excluded.balance,balance_updated_at=excluded.balance_updated_at").bind(account.id, Number(gameRequest.amount), updated)] : []),
          env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(gameRequest.user_id),"deposit",`${gameRequest.game_name} credits added`,`${Number(gameRequest.amount).toFixed(2)} credits were confirmed for ${resolvedUsername}.`,updated),
          env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_completed_credit_request", "game_request", requestId, JSON.stringify({ gameUsername: resolvedUsername, providerReference, amount: gameRequest.amount }), updated),
        ]);
        if (gameRequest.transaction_id) {
          const referredPlayer = await env.DB.prepare("SELECT email FROM users WHERE id=?").bind(String(gameRequest.user_id)).first<{ email: string }>();
          if (referredPlayer) await qualifyReferral(env.DB, referredPlayer.email);
        }
      }
      return NextResponse.json({ message: `${gameRequest.game_name} request completed.` });
    }

    if (action === "staff_update_withdrawal") {
      if (!hasPermission(user.role, "process_withdrawals")) return NextResponse.json({ error: "Finance access required" }, { status: 403 });
      const withdrawalId = String(body.withdrawalId ?? ""); const nextStatus = String(body.status ?? "");
      if (!["processing", "completed", "rejected"].includes(nextStatus)) return NextResponse.json({ error: "Invalid withdrawal status" }, { status: 400 });
      const withdrawal = await env.DB.prepare("SELECT * FROM withdrawals WHERE id=?").bind(withdrawalId).first<Record<string, string | number>>();
      if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
      if (["completed", "rejected"].includes(String(withdrawal.status))) return NextResponse.json({ error: "This withdrawal is already closed" }, { status: 409 });
      const link = await env.DB.prepare("SELECT transaction_id FROM operation_links WHERE entity_type='withdrawal' AND entity_id=?").bind(withdrawalId).first<{ transaction_id: string }>(); const updated = now();
      if (nextStatus === "processing") {
        await env.DB.batch([env.DB.prepare("UPDATE withdrawals SET status='processing' WHERE id=?").bind(withdrawalId), ...(link ? [env.DB.prepare("UPDATE transactions SET status='processing' WHERE id=?").bind(link.transaction_id)] : [])]);
      } else if (nextStatus === "completed") {
        await env.DB.batch([env.DB.prepare("UPDATE wallets SET reserved_balance=MAX(0,reserved_balance-?),updated_at=? WHERE user_id=?").bind(Number(withdrawal.amount), updated, String(withdrawal.user_id)), env.DB.prepare("UPDATE withdrawals SET status='completed' WHERE id=?").bind(withdrawalId), ...(link ? [env.DB.prepare("UPDATE transactions SET status='completed' WHERE id=?").bind(link.transaction_id)] : []),env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(withdrawal.user_id),"withdrawal","Withdrawal completed",`${Number(withdrawal.amount).toFixed(2)} was marked paid.`,updated)]);
      } else {
        await env.DB.batch([env.DB.prepare("UPDATE wallets SET reserved_balance=MAX(0,reserved_balance-?),cash_balance=cash_balance+?,updated_at=? WHERE user_id=?").bind(Number(withdrawal.amount), Number(withdrawal.amount), updated, String(withdrawal.user_id)), env.DB.prepare("UPDATE withdrawals SET status='rejected' WHERE id=?").bind(withdrawalId), ...(link ? [env.DB.prepare("UPDATE transactions SET status='rejected' WHERE id=?").bind(link.transaction_id)] : []),env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),String(withdrawal.user_id),"withdrawal","Withdrawal not completed","The reserved amount was returned to your cash balance.",updated)]);
      }
      await env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, `staff_${nextStatus}_withdrawal`, "withdrawal", withdrawalId, JSON.stringify({ amount: withdrawal.amount }), updated).run();
      return NextResponse.json({ message: `Withdrawal marked ${nextStatus}.` });
    }

    if (action === "staff_search_users") {
      if (!hasPermission(user.role, "manage_users") && !hasPermission(user.role, "manage_staff")) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
      const query = `%${String(body.query ?? "").trim()}%`;
      const results = await env.DB.prepare("SELECT id,email,display_name AS displayName,player_tag AS playerTag,role,status,created_at AS createdAt FROM users WHERE email LIKE ? OR player_tag LIKE ? ORDER BY created_at DESC LIMIT 25").bind(query, query).all();
      return NextResponse.json({ users: results.results });
    }

    if (action === "staff_set_user_role") {
      if (!hasPermission(user.role, "manage_staff")) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
      const targetUserId = String(body.userId ?? ""); const nextRole = String(body.role ?? "");
      if (targetUserId === actorId) return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      if (nextRole !== "player" && !ASSIGNABLE_STAFF_ROLES.includes(nextRole as never)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      const target = await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(targetUserId).first();
      if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET role=? WHERE id=?").bind(nextRole, targetUserId),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_role_changed", "user", targetUserId, JSON.stringify({ role: nextRole }), now()),
      ]);
      return NextResponse.json({ message: `Role updated to ${nextRole}.` });
    }

    if (action === "staff_set_user_status") {
      if (!hasPermission(user.role, "manage_users") && !hasPermission(user.role, "manage_staff")) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
      const targetUserId = String(body.userId ?? ""); const nextStatus = String(body.status ?? "");
      if (targetUserId === actorId) return NextResponse.json({ error: "You cannot change your own status" }, { status: 400 });
      if (!["active", "suspended"].includes(nextStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      const target = await env.DB.prepare("SELECT id,status FROM users WHERE id=?").bind(targetUserId).first<{ id:string; status:string }>();
      if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });
      if (nextStatus === "active" && target.status === "self_excluded") {
        const security = await env.DB.prepare("SELECT self_excluded_until FROM security_settings WHERE user_id=?").bind(targetUserId).first<{ self_excluded_until:string|null }>();
        if (security?.self_excluded_until && security.self_excluded_until > now()) return NextResponse.json({ error: "This self-exclusion period is still active and cannot be ended early" }, { status: 403 });
      }
      await env.DB.prepare("UPDATE users SET status=? WHERE id=?").bind(nextStatus, targetUserId).run();
      if (nextStatus === "suspended") await revokeAllSessions(env.DB, targetUserId);
      await env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "staff_status_changed", "user", targetUserId, JSON.stringify({ status: nextStatus }), now()).run();
      return NextResponse.json({ message: nextStatus === "suspended" ? "Account suspended and signed out everywhere." : "Account reactivated." });
    }

    if (action === "super_create_staff") {
      if (!hasPermission(user.role, "manage_staff")) return NextResponse.json({ error: "Super administrator access required" }, { status: 403 });
      const email = String(body.email ?? "").trim().toLowerCase();
      const displayName = String(body.displayName ?? "").trim().slice(0, 60);
      const password = String(body.password ?? "");
      const role = String(body.role ?? "support");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || password.length < 10) return NextResponse.json({ error: "Enter a name, valid email, and password of at least 10 characters" }, { status: 400 });
      if (!ASSIGNABLE_STAFF_ROLES.includes(role as never)) return NextResponse.json({ error: "Choose a valid staff role" }, { status: 400 });
      if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first()) return NextResponse.json({ error: "That email already has an account" }, { status: 409 });
      const userId = id("usr"); const created = now(); const playerTag = `DFStaff_${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id,email,display_name,player_tag,role,status,referral_code,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(userId,email,displayName,playerTag,role,"active",`STAFF-${crypto.randomUUID().slice(0,8).toUpperCase()}`,created),
        env.DB.prepare("INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)").bind(userId,await hashPassword(password),created),
        env.DB.prepare("INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,1,1,?)").bind(userId,created),
        env.DB.prepare("INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?)").bind(userId,created),
        env.DB.prepare("INSERT INTO wallets (user_id,cash_balance,freeplay_balance,referral_balance,reserved_balance,updated_at) VALUES (?,0,0,0,0,?)").bind(userId,created),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),actorId,"staff_account_created","user",userId,JSON.stringify({ email, role }),created),
      ]);
      return NextResponse.json({ message: `${displayName} was created as ${role.replaceAll("_"," ")}.`, userId });
    }

    if (action === "super_update_game_link") {
      if (!hasPermission(user.role, "manage_platform")) return NextResponse.json({ error: "Super administrator access required" }, { status: 403 });
      const gameId = String(body.gameId ?? ""); const input = String(body.launchUrl ?? "").trim().slice(0,500);
      const adminUrlProvided = Object.prototype.hasOwnProperty.call(body, "adminUrl");
      const adminInput = String(body.adminUrl ?? "").trim().slice(0,500);
      let launchUrl: string | null = null;
      let adminUrl: string | null = null;
      if (input) { try { const parsed = new URL(input); if (!['http:','https:'].includes(parsed.protocol)) throw new Error(); launchUrl = parsed.toString(); } catch { return NextResponse.json({ error: "Enter a full http:// or https:// player URL" }, { status: 400 }); } }
      if (adminInput) { try { const parsed = new URL(adminInput); if (!['http:','https:'].includes(parsed.protocol)) throw new Error(); adminUrl = parsed.toString(); } catch { return NextResponse.json({ error: "Enter a full http:// or https:// provider admin URL" }, { status: 400 }); } }
      if (!await env.DB.prepare("SELECT id FROM games WHERE id=?").bind(gameId).first()) return NextResponse.json({ error: "Game not found" }, { status: 404 });
      await env.DB.batch([
        env.DB.prepare("INSERT INTO game_launch_links (game_id,launch_url,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(game_id) DO UPDATE SET launch_url=excluded.launch_url,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(gameId,launchUrl,actorId,now()),
        ...(adminUrlProvided ? [env.DB.prepare("INSERT INTO game_provider_links (game_id,admin_url,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(game_id) DO UPDATE SET admin_url=excluded.admin_url,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(gameId,adminUrl,actorId,now())] : []),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),actorId,"game_links_updated","game",gameId,JSON.stringify({ playerConfigured: Boolean(launchUrl), adminConfigured: adminUrlProvided ? Boolean(adminUrl) : undefined }),now()),
      ]);
      return NextResponse.json({ message: adminUrlProvided ? "Player and provider admin links saved." : launchUrl ? "Game player link saved for every account." : "Game player link removed." });
    }

    if (action === "admin_update_verification") {
      if (!hasPermission(user.role, "manage_verification")) return NextResponse.json({ error: "Verification access required" }, { status: 403 });
      const verificationId = String(body.verificationId ?? ""); const status = String(body.status ?? ""); const note = String(body.note ?? "").trim().slice(0,500);
      if (!['in_review','approved','rejected'].includes(status)) return NextResponse.json({ error: "Invalid verification status" }, { status: 400 });
      const verification = await env.DB.prepare("SELECT * FROM verification_requests WHERE id=?").bind(verificationId).first<Record<string,string>>();
      if (!verification) return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
      await env.DB.batch([
        env.DB.prepare("UPDATE verification_requests SET status=?,note=?,reviewed_by=?,updated_at=? WHERE id=?").bind(status,note||null,actorId,now(),verificationId),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),verification.user_id,"verification",`Verification ${status.replaceAll("_"," ")}`,note || `Your ${verification.verification_type} verification is ${status.replaceAll("_"," ")}.`,now()),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),actorId,"verification_status_changed","verification",verificationId,JSON.stringify({ status }),now()),
      ]);
      return NextResponse.json({ message: `Verification marked ${status.replaceAll("_"," ")}.` });
    }

    if (action === "admin_update_ticket") {
      if (!hasPermission(user.role, "manage_support")) return NextResponse.json({ error: "Support access required" }, { status: 403 });
      const ticketId = String(body.ticketId ?? ""); const status = String(body.status ?? "open");
      if (!['open','in_progress','resolved','closed'].includes(status)) return NextResponse.json({ error: "Invalid ticket status" }, { status: 400 });
      await env.DB.prepare("UPDATE support_tickets SET status=?,assigned_to=?,updated_at=? WHERE id=?").bind(status,actorId,now(),ticketId).run();
      return NextResponse.json({ message: `Ticket marked ${status.replaceAll("_"," ")}.` });
    }

    if (action === "admin_update_payment_method") {
      if (!hasPermission(user.role, "manage_payments")) return NextResponse.json({ error: "Payment administration access required" }, { status: 403 });
      const methodId = String(body.methodId ?? ""); const enabled = body.enabled === true ? 1 : 0;
      const instructions = String(body.instructions ?? "").trim().slice(0,1000); const destination = String(body.destination ?? "").trim().slice(0,300);
      await env.DB.prepare("UPDATE payment_method_configs SET instructions=?,destination=?,enabled=?,updated_by=?,updated_at=? WHERE id=?").bind(instructions||null,destination||null,enabled,actorId,now(),methodId).run();
      return NextResponse.json({ message: "Payment method updated." });
    }

    if (action === "super_update_payment_link") {
      if (!hasPermission(user.role, "manage_platform")) return NextResponse.json({ error: "Super administrator access required" }, { status: 403 });
      const methodId = String(body.methodId ?? "").trim();
      const paymentUrl = String(body.paymentUrl ?? "").trim().slice(0, 1000);
      const method = await env.DB.prepare("SELECT id,name FROM payment_method_configs WHERE id=?").bind(methodId).first<{ id: string; name: string }>();
      if (!method) return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
      if (paymentUrl && !isHttpUrl(paymentUrl)) return NextResponse.json({ error: "Enter a complete http:// or https:// payment link" }, { status: 400 });
      const updated = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO payment_method_links (method_id,payment_url,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(method_id) DO UPDATE SET payment_url=excluded.payment_url,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(methodId, paymentUrl || null, actorId, updated),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "payment_link_updated", "payment_method", methodId, JSON.stringify({ configured: Boolean(paymentUrl), name: method.name }), updated),
      ]);
      return NextResponse.json({ message: paymentUrl ? `${method.name} payment link saved.` : `${method.name} payment link removed.` });
    }

    if (action === "super_update_support_channel") {
      if (!hasPermission(user.role, "manage_platform")) return NextResponse.json({ error: "Super administrator access required" }, { status: 403 });
      const channelId = String(body.channelId ?? "").trim();
      const destination = String(body.destination ?? "").trim().slice(0, 500);
      const enabled = body.enabled === true;
      const channel = await env.DB.prepare("SELECT id,label,channel_type FROM support_channel_configs WHERE id=?").bind(channelId).first<{ id: string; label: string; channel_type: string }>();
      if (!channel) return NextResponse.json({ error: "Support channel not found" }, { status: 404 });
      if (destination && channel.channel_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) return NextResponse.json({ error: "Enter a valid support email address" }, { status: 400 });
      if (destination && channel.channel_type !== "email" && !isHttpUrl(destination)) return NextResponse.json({ error: "Enter a complete http:// or https:// page link" }, { status: 400 });
      if (enabled && !destination) return NextResponse.json({ error: "Add a contact destination before enabling this channel" }, { status: 400 });
      const updated = now();
      await env.DB.batch([
        env.DB.prepare("UPDATE support_channel_configs SET destination=?,enabled=?,updated_by=?,updated_at=? WHERE id=?").bind(destination || null, enabled ? 1 : 0, actorId, updated, channelId),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"), actorId, "support_channel_updated", "support_channel", channelId, JSON.stringify({ enabled, label: channel.label }), updated),
      ]);
      return NextResponse.json({ message: `${channel.label} contact option updated.` });
    }

    if (action === "admin_save_promotion") {
      if (!hasPermission(user.role, "manage_content")) return NextResponse.json({ error: "Content administration access required" }, { status: 403 });
      const promotionId = String(body.promotionId ?? "") || id("promo"); const title = String(body.title ?? "").trim().slice(0,120); const description = String(body.description ?? "").trim().slice(0,500); const code = String(body.code ?? "").trim().toUpperCase().slice(0,30) || null; const rewardType = String(body.rewardType ?? "freeplay"); const rewardAmount = Number(body.rewardAmount); const status = String(body.status ?? "inactive"); const wagerRequirement = Number(body.wagerRequirement ?? 0);
      if (!title || !description || !['freeplay','cash'].includes(rewardType) || !['active','inactive'].includes(status) || !Number.isFinite(rewardAmount) || rewardAmount < 0) return NextResponse.json({ error: "Complete the promotion fields" }, { status: 400 });
      await env.DB.prepare("INSERT INTO promotions (id,code,title,description,reward_type,reward_amount,status,wager_requirement,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,title=excluded.title,description=excluded.description,reward_type=excluded.reward_type,reward_amount=excluded.reward_amount,status=excluded.status,wager_requirement=excluded.wager_requirement,updated_at=excluded.updated_at").bind(promotionId,code,title,description,rewardType,rewardAmount,status,Math.max(0,wagerRequirement),now(),now()).run();
      return NextResponse.json({ message: "Promotion saved.", promotionId });
    }

    if (action === "admin_save_banner") {
      if (!hasPermission(user.role, "manage_content")) return NextResponse.json({ error: "Content administration access required" }, { status: 403 });
      const bannerId = String(body.bannerId ?? "") || id("banner");
      const title = String(body.title ?? "").trim().slice(0, 120);
      const message = String(body.message ?? "").trim().slice(0, 500);
      const ctaLabel = String(body.ctaLabel ?? "").trim().slice(0, 40);
      const ctaUrlInput = String(body.ctaUrl ?? "").trim().slice(0, 500);
      const imageUrlInput = String(body.imageUrl ?? "").trim().slice(0, 500);
      const status = String(body.status ?? "inactive");
      const safeUrl = (value: string) => { if (!value) return null; if (value.startsWith("/")) return value; try { const parsed = new URL(value); return parsed.protocol === "https:" ? parsed.toString() : null; } catch { return null; } };
      const ctaUrl = safeUrl(ctaUrlInput); const imageUrl = safeUrl(imageUrlInput);
      if (!title || !message || !['active','inactive'].includes(status) || (ctaUrlInput && !ctaUrl) || (imageUrlInput && !imageUrl)) return NextResponse.json({ error: "Complete the banner and use a /path or https:// URL" }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("INSERT INTO promotional_banners (id,title,message,cta_label,cta_url,image_url,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,message=excluded.message,cta_label=excluded.cta_label,cta_url=excluded.cta_url,image_url=excluded.image_url,status=excluded.status,updated_at=excluded.updated_at").bind(bannerId,title,message,ctaLabel||null,ctaUrl,imageUrl,status,now(),now()),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),actorId,"promotional_banner_saved","banner",bannerId,JSON.stringify({ status }),now()),
      ]);
      return NextResponse.json({ message: "Promotional banner saved.", bannerId });
    }

    if (action === "admin_save_cms_page") {
      if (!hasPermission(user.role, "manage_content")) return NextResponse.json({ error: "Content administration access required" }, { status: 403 });
      const slug = String(body.slug ?? "").trim().toLowerCase();
      const title = String(body.title ?? "").trim().slice(0, 120);
      const pageBody = String(body.pageBody ?? "").trim().slice(0, 15000);
      const status = String(body.status ?? "draft");
      if (!['terms','privacy','responsible-gaming','cookies','disclaimer'].includes(slug) || !title || !pageBody || !['draft','published'].includes(status)) return NextResponse.json({ error: "Choose a legal page and complete its title and content" }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_pages (slug,title,body,status,updated_by,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,body=excluded.body,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(slug,title,pageBody,status,actorId,now()),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),actorId,"legal_page_saved","cms_page",slug,JSON.stringify({ status }),now()),
      ]);
      return NextResponse.json({ message: `${title} saved as ${status}.` });
    }

    if (action === "admin_broadcast_notification") {
      if (!hasPermission(user.role, "manage_content")) return NextResponse.json({ error: "Content administration access required" }, { status: 403 });
      const title = String(body.title ?? "").trim().slice(0, 120);
      const message = String(body.message ?? "").trim().slice(0, 500);
      const notificationType = String(body.notificationType ?? "announcement").trim().slice(0, 40);
      if (!title || !message) return NextResponse.json({ error: "Enter a notice title and message" }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) SELECT 'note_'||lower(hex(randomblob(12))),id,?,?,?,? FROM users WHERE role='player' AND status='active'").bind(notificationType,title,message,now()),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),actorId,"player_notification_broadcast","notification","all-active-players",JSON.stringify({ title, notificationType }),now()),
      ]);
      return NextResponse.json({ message: "Notification sent to all active players." });
    }

    if (action === "admin_update_fraud_alert") {
      if (!hasPermission(user.role, "view_audit_log")) return NextResponse.json({ error: "Security administration access required" }, { status: 403 });
      const alertId = String(body.alertId ?? ""); const status = String(body.status ?? "reviewing");
      if (!['open','reviewing','resolved'].includes(status)) return NextResponse.json({ error: "Invalid alert status" }, { status: 400 });
      await env.DB.prepare("UPDATE fraud_alerts SET status=?,reviewed_by=?,updated_at=? WHERE id=?").bind(status,actorId,now(),alertId).run();
      return NextResponse.json({ message: "Security alert updated." });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 });
  }
}
