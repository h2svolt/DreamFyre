import { NextRequest, NextResponse } from "next/server";
import { initializeSchema } from "../../_lib/schema";
import { getRuntimeEnv } from "../../_lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const INACTIVE_DAYS = 3;
const REPEAT_DAYS = 2;
const BATCH_LIMIT = 200;

type Candidate = { id: string; email: string; displayName: string };

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = await getRuntimeEnv();
  await initializeSchema(env.DB);
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM." }, { status: 500 });
  }

  const now = new Date();
  const inactiveThreshold = new Date(now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const repeatThreshold = new Date(now.getTime() - REPEAT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const candidates = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name AS displayName
     FROM users u
     LEFT JOIN login_events le ON le.user_id = u.id AND le.success = 1 AND le.event_type IN ('login','register','login_2fa_completed')
     LEFT JOIN winback_emails w ON w.user_id = u.id
     WHERE u.role = 'player' AND u.status = 'active'
     GROUP BY u.id
     HAVING COALESCE(MAX(le.created_at), u.created_at) <= ?
        AND (MAX(w.last_sent_at) IS NULL OR MAX(w.last_sent_at) <= ?)
     LIMIT ?`
  ).bind(inactiveThreshold, repeatThreshold, BATCH_LIMIT).all<Candidate>();

  let sent = 0;
  let failed = 0;
  const sentAt = now.toISOString();

  for (const player of candidates.results) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [player.email],
          subject: "We miss you at DreamFyre — come back, the fun is waiting!",
          html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>Hey ${player.displayName || "there"}, come back!</h2><p>Your DreamFyre player ID has been quiet for a few days. Fresh missions, FreePlay rewards and the daily wheel are all waiting for you.</p><p style="margin-top:20px"><a href="https://dream-fyre.vercel.app/" style="display:inline-block;padding:12px 24px;background:#F8960E;color:#07130c;font-weight:800;text-decoration:none;border-radius:8px">Return to DreamFyre</a></p><p style="margin-top:24px;color:#888;font-size:12px">You're receiving this because you have a DreamFyre player account.</p></div>`,
        }),
      });
      if (!response.ok) { failed += 1; continue; }
      await env.DB.prepare(
        "INSERT INTO winback_emails (user_id,last_sent_at) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET last_sent_at=excluded.last_sent_at"
      ).bind(player.id, sentAt).run();
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ candidates: candidates.results.length, sent, failed });
}
