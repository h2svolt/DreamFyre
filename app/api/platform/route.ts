import { NextRequest, NextResponse } from "next/server";
import { initializeSchema, seedGames } from "../_lib/schema";
import { getSessionUser, now, id } from "../_lib/session";
import { isStaffRole } from "../_lib/permissions";
import { getRuntimeEnv } from "../_lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dayKey = () => now().slice(0, 10);
const weekKey = () => { const date = new Date(); const day = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() - day + 1); return date.toISOString().slice(0, 10); };
const monthKey = () => now().slice(0, 7);
type RuntimeSecrets = { GAME_CREDENTIAL_ENCRYPTION_KEY?: string };

function fraudThreshold(name: string, fallback: number) {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function credentialKey() {
  const env = await getRuntimeEnv();
  const encoded = (env as unknown as RuntimeSecrets).GAME_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Game credential encryption is not configured");
  const raw = base64ToBytes(encoded);
  if (raw.byteLength !== 32) throw new Error("Game credential encryption key is invalid");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function decryptCredential(value: string) {
  const [iv, encrypted] = value.split(".");
  if (!iv || !encrypted) throw new Error("Stored game credential is invalid");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await credentialKey(), base64ToBytes(encrypted));
  return new TextDecoder().decode(decrypted);
}

async function currentUser(request: NextRequest) {
  const env = await getRuntimeEnv();
  return getSessionUser(request.cookies, env.DB);
}

async function snapshot(user: Record<string, string>) {
  const env = await getRuntimeEnv();
  const userId = user.id;
  const [wallet, games, accounts, tx, withdrawals, referrals, messages, requests, engagement, favorites, playerVolume, profile, paymentMethods, notifications, supportChannels] = await Promise.all([
    env.DB.prepare("SELECT cash_balance,freeplay_balance,referral_balance,reserved_balance FROM wallets WHERE user_id = ?").bind(userId).first<Record<string, number>>(),
    env.DB.prepare("SELECT g.id,g.name,g.short_name AS shortName,g.accent,g.api_status AS apiStatus,l.launch_url AS launchUrl FROM games g LEFT JOIN game_launch_links l ON l.game_id=g.id WHERE g.enabled = 1 ORDER BY g.name").all(),
    env.DB.prepare("SELECT a.id,a.game_id AS gameId,g.name AS gameName,g.accent,a.username,a.status,COALESCE(m.balance,0) AS balance,l.launch_url AS launchUrl,COALESCE(m.balance_updated_at,a.created_at) AS balanceUpdatedAt FROM game_accounts a JOIN games g ON g.id=a.game_id LEFT JOIN game_account_metadata m ON m.account_id=a.id LEFT JOIN game_launch_links l ON l.game_id=a.game_id WHERE a.user_id=? AND a.status='active' ORDER BY a.created_at DESC").bind(userId).all(),
    env.DB.prepare("SELECT id,type,description,amount,status,created_at AS createdAt FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 30").bind(userId).all(),
    env.DB.prepare("SELECT id,amount,method,status,created_at AS createdAt FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT 20").bind(userId).all(),
    env.DB.prepare("SELECT id,referred_email AS referredEmail,status,reward,created_at AS createdAt FROM referrals WHERE referrer_id=? ORDER BY created_at DESC").bind(userId).all(),
    env.DB.prepare("SELECT id,sender_role AS senderRole,message,created_at AS createdAt FROM support_messages WHERE user_id=? ORDER BY created_at ASC LIMIT 50").bind(userId).all(),
    env.DB.prepare("SELECT r.id,r.request_type AS requestType,r.game_id AS gameId,g.name AS gameName,r.amount,r.game_username AS gameUsername,r.status,r.staff_note AS staffNote,r.provider_reference AS providerReference,r.created_at AS createdAt,r.updated_at AS updatedAt FROM game_requests r JOIN games g ON g.id=r.game_id WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 40").bind(userId).all(),
    env.DB.prepare("SELECT action_key AS actionKey,reward_type AS rewardType,reward_amount AS rewardAmount,created_at AS createdAt FROM engagement_actions WHERE user_id=? ORDER BY created_at DESC LIMIT 80").bind(userId).all(),
    env.DB.prepare("SELECT game_id AS gameId FROM game_favorites WHERE user_id=? ORDER BY created_at DESC").bind(userId).all<{ gameId: string }>(),
    env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN amount > 0 AND type='deposit' AND status='completed' THEN amount ELSE 0 END),0) AS total FROM transactions WHERE user_id=?").bind(userId).first<{ total: number }>(),
    env.DB.prepare("SELECT avatar_url AS avatarUrl,age_confirmed AS ageConfirmed,email_verified AS emailVerified FROM user_profiles WHERE user_id=?").bind(userId).first(),
    env.DB.prepare("SELECT m.id,m.name,m.method_type AS methodType,m.network,m.instructions,m.destination,l.payment_url AS paymentUrl,CASE WHEN m.id='chime' THEN '/assets/payments/chime-isaiah-santiago.png' ELSE NULL END AS qrImageUrl FROM payment_method_configs m LEFT JOIN payment_method_links l ON l.method_id=m.id WHERE m.enabled=1 ORDER BY m.name").all(),
    env.DB.prepare("SELECT id,notification_type AS notificationType,title,message,read_at AS readAt,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30").bind(userId).all(),
    env.DB.prepare("SELECT id,label,channel_type AS channelType,destination FROM support_channel_configs WHERE enabled=1 AND destination IS NOT NULL AND trim(destination)<>'' ORDER BY CASE id WHEN 'gmail' THEN 1 WHEN 'facebook' THEN 2 WHEN 'instagram' THEN 3 WHEN 'whatsapp' THEN 4 ELSE 5 END").all(),
  ]);
  return {
    user: { displayName: user.display_name, email: user.email, playerTag: user.player_tag, referralCode: user.referral_code, role: user.role, avatarUrl: (profile as { avatarUrl?: string } | null)?.avatarUrl ?? null, ageConfirmed: Boolean((profile as { ageConfirmed?: number } | null)?.ageConfirmed), emailVerified: Boolean((profile as { emailVerified?: number } | null)?.emailVerified) },
    wallet: { cashBalance: wallet?.cash_balance ?? 0, freeplayBalance: wallet?.freeplay_balance ?? 0, referralBalance: wallet?.referral_balance ?? 0, reservedBalance: wallet?.reserved_balance ?? 0 },
    games: games.results, gameAccounts: accounts.results, gameRequests: requests.results, transactions: tx.results, withdrawals: withdrawals.results, referrals: referrals.results, supportMessages: messages.results,
    engagement: { actions: engagement.results, favoriteGameIds: favorites.results.map((favorite) => String(favorite.gameId)), lifetimeVolume: playerVolume?.total ?? 0 },
    paymentMethods: paymentMethods.results,
    supportChannels: supportChannels.results,
    notifications: notifications.results,
  };
}

export async function GET(request: NextRequest) {
  try {
    const env = await getRuntimeEnv(); await initializeSchema(env.DB); await seedGames(env.DB);
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (isStaffRole(user.role)) return NextResponse.json({ error: "Staff accounts use the operations portal" }, { status: 403 });
    return NextResponse.json(await snapshot(user));
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const env = await getRuntimeEnv(); await initializeSchema(env.DB); await seedGames(env.DB);
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (isStaffRole(user.role)) return NextResponse.json({ error: "Staff accounts cannot use player actions" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? ""); const userId = user.id;
    if (action === "create_game_account") {
      const profile = await env.DB.prepare("SELECT age_confirmed FROM user_profiles WHERE user_id=?").bind(userId).first<{ age_confirmed: number }>();
      if (!profile?.age_confirmed) return NextResponse.json({ error: "Confirm your legal age in Profile before requesting a game account" }, { status: 403 });
      const gameId = String(body.gameId ?? ""); const game = await env.DB.prepare("SELECT * FROM games WHERE id=? AND enabled=1").bind(gameId).first<Record<string,string>>();
      if (!game) return NextResponse.json({ error: "Game provider not found" }, { status: 404 });
      const activeAccount = await env.DB.prepare("SELECT id FROM game_accounts WHERE user_id=? AND game_id=? AND status='active'").bind(userId,gameId).first();
      if (activeAccount) return NextResponse.json({ error: "You already have an active account for this game" }, { status: 409 });
      const openRequest = await env.DB.prepare("SELECT id FROM game_requests WHERE user_id=? AND game_id=? AND request_type='account' AND status NOT IN ('completed','rejected')").bind(userId,gameId).first();
      if (openRequest) return NextResponse.json({ error: "This game account is already being created" }, { status: 409 });
      const requestId=id("greq"); const created=now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO game_requests (id,user_id,game_id,request_type,amount,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(requestId,userId,gameId,"account",0,"pending_staff",created,created),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),userId,"game_account_requested","game_request",requestId,JSON.stringify({gameId}),created),
      ]);
      return NextResponse.json({ message: `${game.name} account creation started.`, requestId });
    }
    if (action === "toggle_game_favorite") {
      const gameId = String(body.gameId ?? "");
      const game = await env.DB.prepare("SELECT id FROM games WHERE id=? AND enabled=1").bind(gameId).first();
      if (!game) return NextResponse.json({ error: "Game provider not found" }, { status: 404 });
      const existing = await env.DB.prepare("SELECT game_id FROM game_favorites WHERE user_id=? AND game_id=?").bind(userId, gameId).first();
      if (existing) await env.DB.prepare("DELETE FROM game_favorites WHERE user_id=? AND game_id=?").bind(userId, gameId).run();
      else await env.DB.prepare("INSERT INTO game_favorites (user_id,game_id,created_at) VALUES (?,?,?)").bind(userId, gameId, now()).run();
      return NextResponse.json({ message: existing ? "Removed from favorites." : "Added to favorites.", favorite: !existing });
    }
    if (action === "claim_engagement_reward") {
      const rewardKey = String(body.rewardKey ?? "");
      const rewards: Record<string, { amount: number; period: string; description: string }> = {
        "daily-login": { amount: 0.25, period: dayKey(), description: "Daily login reward" },
        "daily-credit": { amount: 4, period: dayKey(), description: "Daily credit-load task" },
        "weekly-transfer": { amount: 8, period: weekKey(), description: "Weekly transfer task" },
        "weekly-referral": { amount: 12, period: weekKey(), description: "Weekly referral task" },
        "vip-monthly": { amount: 20, period: monthKey(), description: "VIP monthly FreePlay reward" },
      };
      const reward = rewards[rewardKey];
      if (!reward) return NextResponse.json({ error: "Reward is unavailable" }, { status: 400 });
      let eligible = rewardKey === "daily-login";
      if (rewardKey === "daily-credit") eligible = Boolean(await env.DB.prepare("SELECT id FROM transactions WHERE user_id=? AND type='deposit' AND status='completed' AND created_at>=? LIMIT 1").bind(userId, `${dayKey()}T00:00:00.000Z`).first());
      if (rewardKey === "weekly-transfer") eligible = Boolean(await env.DB.prepare("SELECT id FROM transactions WHERE user_id=? AND type='transfer' AND status='completed' AND created_at>=? LIMIT 1").bind(userId, `${weekKey()}T00:00:00.000Z`).first());
      if (rewardKey === "weekly-referral") eligible = Boolean(await env.DB.prepare("SELECT id FROM referrals WHERE referrer_id=? AND status IN ('qualified','completed') AND created_at>=? LIMIT 1").bind(userId, `${weekKey()}T00:00:00.000Z`).first());
      if (rewardKey === "vip-monthly") { const deposits = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id=? AND type='deposit' AND status='completed' AND created_at>=?").bind(userId, `${monthKey()}-01T00:00:00.000Z`).first<{total:number}>(); eligible = Number(deposits?.total ?? 0) >= 50; }
      if (!eligible) return NextResponse.json({ error: "Complete this activity before claiming the reward" }, { status: 409 });
      const actionKey = `${rewardKey}:${reward.period}`;
      if (await env.DB.prepare("SELECT id FROM engagement_actions WHERE user_id=? AND action_key=?").bind(userId, actionKey).first()) return NextResponse.json({ error: "This reward has already been claimed" }, { status: 409 });
      const created = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO engagement_actions (id,user_id,action_key,reward_type,reward_amount,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("eng"),userId,actionKey,"freeplay",reward.amount,JSON.stringify({rewardKey}),created),
        env.DB.prepare("UPDATE wallets SET freeplay_balance=freeplay_balance+?,updated_at=? WHERE user_id=?").bind(reward.amount,created,userId),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"),userId,"reward",reward.amount,"FP","completed",reward.description,created),
      ]);
      return NextResponse.json({ message: `${reward.amount} FreePlay credits claimed.` });
    }
    if (action === "spin_daily_roulette") {
      const actionKey = `daily-spin:${dayKey()}`;
      if (await env.DB.prepare("SELECT id FROM engagement_actions WHERE user_id=? AND action_key=?").bind(userId, actionKey).first()) return NextResponse.json({ error: "Today’s roulette spin has already been used" }, { status: 409 });
      const rewards = [0.25, 0.5, 1, 2, 3, 5, 0.5, 1];
      const weights = [500, 150, 60, 40, 25, 15, 150, 60]; // heavily favors the lowest value; sums to 1000
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      const roll = crypto.getRandomValues(new Uint16Array(1))[0] % totalWeight;
      let cumulative = 0; let rewardIndex = weights.length - 1;
      for (let i = 0; i < weights.length; i += 1) { cumulative += weights[i]; if (roll < cumulative) { rewardIndex = i; break; } }
      const reward = rewards[rewardIndex]; const created = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO engagement_actions (id,user_id,action_key,reward_type,reward_amount,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("eng"),userId,actionKey,"freeplay",reward,JSON.stringify({wheel:"daily"}),created),
        env.DB.prepare("UPDATE wallets SET freeplay_balance=freeplay_balance+?,updated_at=? WHERE user_id=?").bind(reward,created,userId),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"),userId,"reward",reward,"FP","completed","Daily roulette reward",created),
      ]);
      return NextResponse.json({ message: `You won ${reward} FreePlay credits!`, reward, rewardIndex });
    }
    if (action === "exchange_freeplay") {
      const amount = Math.floor(Number(body.amount)); const wallet = await env.DB.prepare("SELECT freeplay_balance FROM wallets WHERE user_id=?").bind(userId).first<{freeplay_balance:number}>();
      if (!wallet || !Number.isFinite(amount) || amount < 10 || amount > wallet.freeplay_balance) return NextResponse.json({ error: "Exchange at least 10 available FreePlay credits" }, { status: 400 });
      const cashAmount = Number((amount / 10).toFixed(2)); const created = now();
      await env.DB.batch([
        env.DB.prepare("UPDATE wallets SET freeplay_balance=freeplay_balance-?,cash_balance=cash_balance+?,updated_at=? WHERE user_id=?").bind(amount,cashAmount,created,userId),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"),userId,"marketplace",cashAmount,"USD","completed",`Exchanged ${amount} FP credits`,created),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),userId,"freeplay_exchanged","wallet",userId,JSON.stringify({freeplay:amount,cash:cashAmount}),created),
      ]);
      return NextResponse.json({ message: `${amount} FP exchanged for ${cashAmount.toFixed(2)} cash balance.` });
    }
    if (action === "create_deposit") {
      const amount = Number(body.amount); const method = String(body.method ?? ""); const gameId = String(body.gameId ?? ""); const proofKey = String(body.proofKey ?? ""); const gameUsername = String(body.gameUsername ?? "").trim().slice(0,80);
      const [profile, security] = await Promise.all([
        env.DB.prepare("SELECT age_confirmed,email_verified FROM user_profiles WHERE user_id=?").bind(userId).first<{ age_confirmed: number; email_verified: number }>(),
        env.DB.prepare("SELECT deposit_limit,self_excluded_until FROM security_settings WHERE user_id=?").bind(userId).first<{ deposit_limit: number | null; self_excluded_until: string | null }>(),
      ]);
      if (!profile?.age_confirmed || !profile.email_verified) return NextResponse.json({ error: "Confirm your legal age and verify your email before depositing" }, { status: 403 });
      if (security?.self_excluded_until && security.self_excluded_until > now()) return NextResponse.json({ error: "Deposits are unavailable during self-exclusion" }, { status: 403 });
      if (security?.deposit_limit != null && amount > Number(security.deposit_limit)) return NextResponse.json({ error: `This request exceeds your $${Number(security.deposit_limit).toFixed(2)} deposit limit` }, { status: 400 });
      if (!Number.isFinite(amount) || amount < 5 || !method || !gameId || !proofKey) return NextResponse.json({ error: "Complete all payment fields and upload proof" }, { status: 400 });
      const paymentMethod = await env.DB.prepare("SELECT m.id,m.destination,l.payment_url AS payment_url FROM payment_method_configs m LEFT JOIN payment_method_links l ON l.method_id=m.id WHERE m.name=? AND m.enabled=1").bind(method).first<{ id: string; destination: string | null; payment_url: string | null }>();
      if (!paymentMethod) return NextResponse.json({ error: "The selected payment method is unavailable" }, { status: 400 });
      if (!paymentMethod.payment_url && !paymentMethod.destination) return NextResponse.json({ error: "The selected payment method is waiting for payment details from the super administrator" }, { status: 409 });
      const ownedProof = await env.DB.prepare("SELECT proof_key FROM payment_proofs WHERE proof_key=? AND user_id=?").bind(proofKey, userId).first();
      if (!ownedProof) return NextResponse.json({ error: "Upload a valid payment proof for this account" }, { status: 400 });
      const usedProof = await env.DB.prepare("SELECT id FROM transactions WHERE proof_key=? LIMIT 1").bind(proofKey).first();
      if (usedProof) {
        const recorded = now();
        await env.DB.prepare("INSERT INTO fraud_alerts (id,user_id,alert_type,severity,status,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("fraud"),userId,"duplicate_payment_proof","high","open","A player attempted to reuse payment proof that was already attached to another transaction.",recorded,recorded).run();
        return NextResponse.json({ error: "This payment proof has already been submitted" }, { status: 409 });
      }
      const game = await env.DB.prepare("SELECT name FROM games WHERE id=? AND enabled=1").bind(gameId).first<{name:string}>();
      if (!game) return NextResponse.json({ error: "Selected game is unavailable" }, { status: 404 });
      const txId = id("tx"); const requestId=id("greq"); const created=now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,provider,game_id,proof_key,description,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(txId,userId,"deposit",amount,"USD","payment_review",method,gameId,proofKey,`${game.name} credit request`,created),
        env.DB.prepare("INSERT INTO game_requests (id,user_id,game_id,transaction_id,request_type,amount,game_username,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(requestId,userId,gameId,txId,"credit",amount,gameUsername || null,"payment_review",created,created),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),userId,"deposit","Deposit submitted",`${amount.toFixed(2)} for ${game.name} is waiting for payment review.`,created),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),userId,"game_credit_requested","game_request",requestId,JSON.stringify({amount,method,gameId,txId}),created),
        ...(amount >= fraudThreshold("FRAUD_LARGE_DEPOSIT_THRESHOLD", 1000) ? [env.DB.prepare("INSERT INTO fraud_alerts (id,user_id,alert_type,severity,status,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("fraud"),userId,"large_deposit_request","medium","open",`Deposit request of ${amount.toFixed(2)} requires enhanced review.`,created,created)] : []),
      ]);
      return NextResponse.json({ message: "Payment submitted. We will verify it and update the selected game.", transactionId: txId, requestId });
    }
    if (action === "create_withdrawal") {
      const amount = Number(body.amount); const method = String(body.method ?? ""); const destination = String(body.destination ?? "").trim();
      if (method !== "Bank Account") {
        const payoutMethod = await env.DB.prepare("SELECT id FROM payment_method_configs WHERE name=? AND enabled=1 AND method_type IN ('wallet','crypto')").bind(method).first();
        if (!payoutMethod) return NextResponse.json({ error: "The selected payout method is unavailable" }, { status: 400 });
      }
      const verification = await env.DB.prepare("SELECT id FROM verification_requests WHERE user_id=? AND verification_type='identity' AND status='approved' ORDER BY updated_at DESC LIMIT 1").bind(userId).first();
      if (!verification) return NextResponse.json({ error: "Identity verification must be approved before withdrawing" }, { status: 403 });
      const wallet = await env.DB.prepare("SELECT cash_balance,reserved_balance FROM wallets WHERE user_id=?").bind(userId).first<{cash_balance:number;reserved_balance:number}>();
      if (!wallet || !Number.isFinite(amount) || amount < 10 || amount > wallet.cash_balance || destination.length < 4) return NextResponse.json({ error: "Check the amount and payout destination" }, { status: 400 });
      const withdrawalId=id("wd"); const transactionId=id("tx"); const masked=`••••${destination.slice(-4)}`;
      const created=now();
      await env.DB.batch([
        env.DB.prepare("UPDATE wallets SET cash_balance=cash_balance-?,reserved_balance=reserved_balance+?,updated_at=? WHERE user_id=?").bind(amount,amount,created,userId),
        env.DB.prepare("INSERT INTO withdrawals (id,user_id,amount,method,destination_masked,status,created_at) VALUES (?,?,?,?,?,?,?)").bind(withdrawalId,userId,amount,method,masked,"pending_review",created),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,provider,description,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(transactionId,userId,"withdrawal",-amount,"USD","pending_review",method,`Withdrawal to ${masked}`,created),
        env.DB.prepare("INSERT INTO operation_links (entity_type,entity_id,transaction_id) VALUES (?,?,?)").bind("withdrawal",withdrawalId,transactionId),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),userId,"withdrawal","Withdrawal submitted",`${amount.toFixed(2)} is reserved while the payout is reviewed.`,created),
        ...(amount >= fraudThreshold("FRAUD_LARGE_WITHDRAWAL_THRESHOLD", 1000) ? [env.DB.prepare("INSERT INTO fraud_alerts (id,user_id,alert_type,severity,status,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("fraud"),userId,"large_withdrawal_request","high","open",`Withdrawal request of ${amount.toFixed(2)} requires enhanced review.`,created,created)] : []),
      ]);
      return NextResponse.json({ message: "Withdrawal submitted and funds reserved safely." });
    }
    if(action==="refresh_game_balance"){
      const accountId=String(body.accountId??"");
      const account=await env.DB.prepare("SELECT a.id,COALESCE(m.balance,0) AS balance,COALESCE(m.balance_updated_at,a.created_at) AS balance_updated_at FROM game_accounts a LEFT JOIN game_account_metadata m ON m.account_id=a.id WHERE a.id=? AND a.user_id=?").bind(accountId,userId).first<{id:string;balance:number;balance_updated_at:string}>();
      if(!account)return NextResponse.json({error:"Game account not found"},{status:404});
      return NextResponse.json({message:"Verified game balance refreshed.",balance:Number(account.balance),balanceUpdatedAt:account.balance_updated_at});
    }
    if(action==="request_password_reset"){
      const accountId=String(body.accountId??"");
      const account=await env.DB.prepare("SELECT a.id,a.game_id,a.username,g.name FROM game_accounts a JOIN games g ON g.id=a.game_id WHERE a.id=? AND a.user_id=? AND a.status='active'").bind(accountId,userId).first<{id:string;game_id:string;username:string;name:string}>();
      if(!account)return NextResponse.json({error:"Active game account not found"},{status:404});
      const open=await env.DB.prepare("SELECT id FROM game_requests WHERE user_id=? AND game_id=? AND request_type='password_reset' AND status NOT IN ('completed','rejected') LIMIT 1").bind(userId,account.game_id).first();
      if(open)return NextResponse.json({error:"A password reset for this game is already with support"},{status:409});
      const requestId=id("greq");const created=now();const message=`Password reset requested for ${account.name} account ${account.username}.`;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO game_requests (id,user_id,game_id,request_type,amount,game_username,status,staff_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(requestId,userId,account.game_id,"password_reset",0,account.username,"pending_staff","Support confirmation requested",created,created),
        env.DB.prepare("INSERT INTO support_messages (id,user_id,sender_role,channel,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("msg"),userId,"player","password_reset",message,created),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),userId,"game_password_reset_requested","game_request",requestId,JSON.stringify({accountId,gameId:account.game_id}),created),
      ]);
      return NextResponse.json({message:`${account.name} password reset sent to support.`,requestId});
    }
    if(action==="request_game_credit_withdrawal"){
      const accountId=String(body.accountId??"");const amount=Number(body.amount);
      const account=await env.DB.prepare("SELECT a.id,a.game_id,a.username,g.name,COALESCE(m.balance,0) AS balance FROM game_accounts a JOIN games g ON g.id=a.game_id LEFT JOIN game_account_metadata m ON m.account_id=a.id WHERE a.id=? AND a.user_id=? AND a.status='active'").bind(accountId,userId).first<{id:string;game_id:string;username:string;name:string;balance:number}>();
      if(!account||!Number.isFinite(amount)||amount<5)return NextResponse.json({error:"Enter at least $5 from an active game account"},{status:400});
      const pending=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM game_requests WHERE user_id=? AND game_id=? AND request_type='credit_withdrawal' AND status NOT IN ('completed','rejected')").bind(userId,account.game_id).first<{total:number}>();
      if(amount>Number(account.balance)-Number(pending?.total??0))return NextResponse.json({error:"Amount exceeds the available recorded game balance"},{status:400});
      const requestId=id("greq");const created=now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO game_requests (id,user_id,game_id,request_type,amount,game_username,status,staff_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(requestId,userId,account.game_id,"credit_withdrawal",amount,account.username,"pending_staff","Game-credit redemption requested",created,created),
        env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),userId,"game_credit_withdrawal_requested","game_request",requestId,JSON.stringify({accountId,amount}),created),
      ]);
      return NextResponse.json({message:`${amount.toFixed(2)} ${account.name} withdrawal submitted.`,requestId});
    }
    if(action==="reveal_game_password"){
      const accountId=String(body.accountId??"");
      const account=isStaffRole(user.role)
        ? await env.DB.prepare("SELECT encrypted_password FROM game_accounts WHERE id=?").bind(accountId).first<{encrypted_password:string}>()
        : await env.DB.prepare("SELECT encrypted_password FROM game_accounts WHERE id=? AND user_id=? AND status='active'").bind(accountId,userId).first<{encrypted_password:string}>();
      if(!account)return NextResponse.json({error:"Game account not found"},{status:404});
      const password=await decryptCredential(account.encrypted_password);
      await env.DB.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("audit"),userId,"game_password_revealed","game_account",accountId,null,now()).run();
      return NextResponse.json({password});
    }
    if (action === "lookup_player") {
      const playerTag = String(body.playerTag ?? "").trim();
      if (!playerTag) return NextResponse.json({ error: "Enter a player ID" }, { status: 400 });
      const player = await env.DB.prepare(
        "SELECT display_name AS displayName,player_tag AS playerTag FROM users WHERE player_tag=? AND status='active' AND id<>?"
      ).bind(playerTag, userId).first<{ displayName: string; playerTag: string }>();
      if (!player) return NextResponse.json({ error: "Player ID not found" }, { status: 404 });
      return NextResponse.json({ player });
    }
    if (action === "create_transfer") {
      const amount=Number(body.amount); const tag=String(body.recipient??"").trim(); const note=String(body.note??"").slice(0,80);
      const recipient=await env.DB.prepare("SELECT id FROM users WHERE player_tag=? AND status='active'").bind(tag).first<{id:string}>();
      const wallet=await env.DB.prepare("SELECT cash_balance FROM wallets WHERE user_id=?").bind(userId).first<{cash_balance:number}>();
      if(!recipient||recipient.id===userId)return NextResponse.json({error:"Recipient could not be verified"},{status:400});
      if(!wallet||!Number.isFinite(amount)||amount<1||amount>wallet.cash_balance)return NextResponse.json({error:"Insufficient balance or invalid amount"},{status:400});
      const transferId=id("tr"); const created=now();
      await env.DB.batch([
        env.DB.prepare("UPDATE wallets SET cash_balance=cash_balance-?,updated_at=? WHERE user_id=?").bind(amount,created,userId),
        env.DB.prepare("UPDATE wallets SET cash_balance=cash_balance+?,updated_at=? WHERE user_id=?").bind(amount,created,recipient.id),
        env.DB.prepare("INSERT INTO transfers (id,sender_id,recipient_id,amount,note,status,created_at) VALUES (?,?,?,?,?,?,?)").bind(transferId,userId,recipient.id,amount,note,"completed",created),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"),userId,"transfer",-amount,"USD","completed",`Transfer to ${tag}`,created),
        env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"),recipient.id,"transfer",amount,"USD","completed",`Transfer from ${user.player_tag}`,created),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"),recipient.id,"transfer","Player transfer received",`${amount.toFixed(2)} was received from ${user.player_tag}.`,created),
        ...(amount >= fraudThreshold("FRAUD_LARGE_TRANSFER_THRESHOLD", 500) ? [env.DB.prepare("INSERT INTO fraud_alerts (id,user_id,alert_type,severity,status,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("fraud"),userId,"large_player_transfer","medium","open",`Player transfer of ${amount.toFixed(2)} to ${tag} requires review.`,created,created)] : []),
      ]);
      return NextResponse.json({message:`${amount.toFixed(2)} transferred to ${tag}.`});
    }
    if(action==="support_message"){
      const message=String(body.message??"").trim().slice(0,1000);if(!message)return NextResponse.json({error:"Write a message first"},{status:400});
      await env.DB.prepare("INSERT INTO support_messages (id,user_id,sender_role,channel,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("msg"),userId,"player",String(body.channel??"chat"),message,now()).run();
      return NextResponse.json({message:"Message sent securely."});
    }
    if (action === "record_game_launch") {
      const accountId = String(body.accountId ?? "");
      const account = await env.DB.prepare("SELECT a.id,a.game_id,l.launch_url FROM game_accounts a LEFT JOIN game_launch_links l ON l.game_id=a.game_id WHERE a.id=? AND a.user_id=? AND a.status='active'").bind(accountId,userId).first<{id:string;game_id:string;launch_url:string|null}>();
      if (!account) return NextResponse.json({ error: "Active game account not found" }, { status: 404 });
      if (!account.launch_url) return NextResponse.json({ error: "This game's player link has not been configured yet" }, { status: 409 });
      await env.DB.prepare("INSERT INTO game_activity (id,user_id,game_id,game_account_id,event_type,result,amount,session_reference,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id("play"),userId,account.game_id,account.id,"launched",null,0,id("session"),now()).run();
      return NextResponse.json({ message: "Game opened.", launchUrl: account.launch_url });
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 }); }
}
