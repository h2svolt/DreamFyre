import { NextRequest, NextResponse } from "next/server";
import { getRuntimeEnv } from "../_lib/runtime";
import { initializeSchema } from "../_lib/schema";
import { getSessionUser, now } from "../_lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: NextRequest) {
  const env = await getRuntimeEnv(); await initializeSchema(env.DB);
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "User is required" }, { status: 400 });
  const image = await env.DB.prepare("SELECT mime_type,data FROM profile_images WHERE user_id=?").bind(userId).first<{ mime_type: string; data: Uint8Array | ArrayBuffer }>();
  if (!image) return new NextResponse(null, { status: 404 });
  const data = image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data);
  const copy = new Uint8Array(data.byteLength); copy.set(data);
  return new NextResponse(copy.buffer, { headers: { "content-type": image.mime_type, "cache-control": "public, max-age=300, stale-while-revalidate=3600" } });
}

export async function POST(request: NextRequest) {
  try {
    const env = await getRuntimeEnv(); await initializeSchema(env.DB);
    const user = await getSessionUser(request.cookies, env.DB);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const form = await request.formData();
    const image = form.get("avatar");
    if (!(image instanceof File) || !allowed.has(image.type)) return NextResponse.json({ error: "Upload a JPG, PNG or WebP image" }, { status: 400 });
    if (image.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Profile image must be 2MB or smaller" }, { status: 413 });
    const updated = now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO profile_images (user_id,mime_type,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET mime_type=excluded.mime_type,data=excluded.data,updated_at=excluded.updated_at").bind(user.id, image.type, new Uint8Array(await image.arrayBuffer()), updated),
      env.DB.prepare("UPDATE user_profiles SET avatar_url=?,updated_at=? WHERE user_id=?").bind(`/api/avatar?userId=${encodeURIComponent(user.id)}`, updated, user.id),
    ]);
    return NextResponse.json({ message: "Profile picture updated.", avatarUrl: `/api/avatar?userId=${encodeURIComponent(user.id)}&v=${Date.now()}` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 }); }
}
