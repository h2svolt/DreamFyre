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

const SITE_URL = "https://dream-fyre.vercel.app";
const LOGO_URL = `${SITE_URL}/dreamfyre-wordmark.png`;

function winbackEmailHtml(displayName: string) {
  const name = displayName || "there";
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(20,20,30,0.08);">
        <tr>
          <td align="center" style="background:#0a0f1a;padding:36px 24px;">
            <img src="${LOGO_URL}" alt="DreamFyre" width="220" style="display:block;width:220px;max-width:70%;height:auto;margin:0 auto;">
            <p style="margin:14px 0 0;color:#9aa7bb;font-size:13px;letter-spacing:.04em;">Your games. Your wallet. One secure place.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 8px;">
            <h1 style="margin:0 0 16px;color:#101522;font-size:24px;line-height:1.3;">We miss you, ${name}! 🔥</h1>
            <p style="margin:0 0 14px;color:#44506a;font-size:15px;line-height:1.65;">Your DreamFyre player ID has been quiet for a few days — and the fun's been waiting on you. Fresh daily missions, FreePlay rewards, and the daily FYRE wheel are all sitting there ready to go.</p>
            <p style="margin:0 0 26px;color:#44506a;font-size:15px;line-height:1.65;">Jump back in and see what you've missed.</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td style="border-radius:10px;background:#F8960E;">
                <a href="${SITE_URL}/" style="display:inline-block;padding:14px 32px;color:#0a0f1a;font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;">Come back and play →</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 32px;border-top:1px solid #edf0f5;margin-top:20px;">
            <p style="margin:20px 0 0;color:#93a0b8;font-size:11px;line-height:1.6;">You're receiving this because you have a DreamFyre player account. Play responsibly — eligibility and local restrictions apply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

  // Manual test mode: ?test=you@example.com sends the template once, immediately,
  // to that address only - bypasses the inactivity check and doesn't touch
  // winback_emails, so it never interferes with the real automated schedule.
  const testEmail = request.nextUrl.searchParams.get("test");
  if (testEmail) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [testEmail],
        subject: "[TEST] We miss you at DreamFyre — come back, the fun is waiting!",
        html: winbackEmailHtml(request.nextUrl.searchParams.get("name") || "there"),
      }),
    });
    const body = await response.json();
    return NextResponse.json({ test: true, to: testEmail, resendStatus: response.status, resendBody: body }, { status: response.ok ? 200 : 502 });
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
          html: winbackEmailHtml(player.displayName),
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
