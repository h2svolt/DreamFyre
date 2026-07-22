import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../_lib/session";
import { isStaffRole } from "../_lib/permissions";
import { initializeSchema } from "../_lib/schema";
import { getRuntimeEnv } from "../_lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProofRow = {
  mime_type: string;
  data: Uint8Array | ArrayBuffer;
};

function responseBody(data: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

export async function GET(request: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    const transactionId = request.nextUrl.searchParams.get("transactionId") ?? "";
    const user = await getSessionUser(request.cookies, env.DB);
    if (!user) return NextResponse.json({ error: "Sign in before viewing payment proof" }, { status: 401 });

    const transaction = await env.DB
      .prepare("SELECT user_id,proof_key FROM transactions WHERE id=? AND proof_key IS NOT NULL")
      .bind(transactionId)
      .first<{ user_id: string; proof_key: string }>();
    if (!transaction) return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
    if (transaction.user_id !== user.id && !isStaffRole(user.role)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const proof = await env.DB
      .prepare("SELECT mime_type,data FROM payment_proofs WHERE proof_key=?")
      .bind(transaction.proof_key)
      .first<ProofRow>();
    if (!proof) return NextResponse.json({ error: "Payment proof file not found" }, { status: 404 });

    return new Response(responseBody(proof.data), {
      headers: {
        "content-type": proof.mime_type || "application/octet-stream",
        "cache-control": "private, no-store",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load payment proof" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    const user = await getSessionUser(request.cookies, env.DB);
    if (!user) return NextResponse.json({ error: "Sign in before uploading payment proof" }, { status: 401 });
    if (isStaffRole(user.role)) return NextResponse.json({ error: "Staff accounts cannot upload player payment proofs" }, { status: 403 });

    const form = await request.formData();
    const file = form.get("proof");
    if (!(file instanceof File)) return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Use a PNG, JPG or WebP under 4MB" }, { status: 400 });
    }

    const key = `payment-proofs/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
    await env.DB
      .prepare("INSERT INTO payment_proofs (proof_key,user_id,mime_type,data,created_at) VALUES (?,?,?,?,?)")
      .bind(key, user.id, file.type, await file.arrayBuffer(), new Date().toISOString())
      .run();
    return NextResponse.json({ key });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
