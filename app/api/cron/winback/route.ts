import { NextRequest, NextResponse } from "next/server";
import emailjs from "@emailjs/nodejs";
import { initializeSchema } from "../../_lib/schema";
import { getRuntimeEnv } from "../../_lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const INACTIVE_DAYS = 3;
const REPEAT_DAYS = 2;
const BATCH_LIMIT = 200;

type Candidate = { id: string; email: string; displayName: string };

function emailjsConfig() {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!serviceId || !templateId || !publicKey || !privateKey) return null;
  return { serviceId, templateId, publicKey, privateKey };
}

async function sendWinbackEmail(config: NonNullable<ReturnType<typeof emailjsConfig>>, toEmail: string, name: string) {
  emailjs.init({ publicKey: config.publicKey, privateKey: config.privateKey });
  return emailjs.send(config.serviceId, config.templateId, { to_email: toEmail, name: name || "there" });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = emailjsConfig();
  if (!config) {
    return NextResponse.json({ error: "Email delivery is not configured. Add EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and EMAILJS_PRIVATE_KEY." }, { status: 500 });
  }

  const env = await getRuntimeEnv();
  await initializeSchema(env.DB);

  // Manual test mode: ?test=you@example.com sends the template once, immediately,
  // to that address only - bypasses the inactivity check and doesn't touch
  // winback_emails, so it never interferes with the real automated schedule.
  const testEmail = request.nextUrl.searchParams.get("test");
  if (testEmail) {
    try {
      const result = await sendWinbackEmail(config, testEmail, request.nextUrl.searchParams.get("name") || "there");
      return NextResponse.json({ test: true, to: testEmail, status: result.status, text: result.text });
    } catch (error) {
      const details = error && typeof error === "object" && "status" in error && "text" in error
        ? { status: (error as { status: unknown }).status, text: (error as { text: unknown }).text }
        : { message: error instanceof Error ? error.message : String(error) };
      return NextResponse.json({ test: true, to: testEmail, error: details }, { status: 502 });
    }
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
      await sendWinbackEmail(config, player.email, player.displayName);
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
