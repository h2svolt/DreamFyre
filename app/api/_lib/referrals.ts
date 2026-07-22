import "server-only";

import { id, now } from "./session";

type DatabaseLike = Pick<Database, "prepare" | "batch">;

export const REFERRAL_COOKIE = "df_referral";

export async function attachReferral(db: DatabaseLike, referredEmail: string, referralCode?: string | null) {
  const code = String(referralCode ?? "").trim().toUpperCase().slice(0, 40);
  if (!code) return null;
  const referrer = await db.prepare("SELECT id,email FROM users WHERE UPPER(referral_code)=? AND status='active'").bind(code).first<{ id: string; email: string }>();
  if (!referrer || referrer.email.toLowerCase() === referredEmail.toLowerCase()) return null;
  if (await db.prepare("SELECT id FROM referrals WHERE LOWER(referred_email)=LOWER(?) LIMIT 1").bind(referredEmail).first()) return null;
  const referralId = id("ref");
  await db.prepare("INSERT INTO referrals (id,referrer_id,referred_email,status,reward,created_at) VALUES (?,?,?,?,0,?)")
    .bind(referralId, referrer.id, referredEmail.toLowerCase(), "registered", now()).run();
  return { referralId, referrerId: referrer.id };
}

export async function qualifyReferral(db: DatabaseLike, referredEmail: string) {
  const referral = await db.prepare("SELECT id,referrer_id FROM referrals WHERE LOWER(referred_email)=LOWER(?) AND status='registered' ORDER BY created_at ASC LIMIT 1")
    .bind(referredEmail).first<{ id: string; referrer_id: string }>();
  if (!referral) return null;
  const promotion = await db.prepare("SELECT reward_amount FROM promotions WHERE id='promo-referral' AND status='active'").first<{ reward_amount: number }>();
  const reward = Math.max(0, Number(promotion?.reward_amount ?? 5));
  const created = now();
  await db.batch([
    db.prepare("UPDATE referrals SET status='qualified',reward=? WHERE id=? AND status='registered'").bind(reward, referral.id),
    db.prepare("UPDATE wallets SET referral_balance=referral_balance+?,updated_at=? WHERE user_id=?").bind(reward, created, referral.referrer_id),
    db.prepare("INSERT INTO transactions (id,user_id,type,amount,currency,status,description,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id("tx"), referral.referrer_id, "referral", reward, "USD", "completed", "Qualified player referral", created),
    db.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), referral.referrer_id, "referral", "Referral reward earned", `${reward.toFixed(2)} was added to your referral balance after a qualifying player activity.`, created),
  ]);
  return { referralId: referral.id, referrerId: referral.referrer_id, reward };
}
