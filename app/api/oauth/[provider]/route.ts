import { NextRequest, NextResponse } from "next/server";
import { isOAuthProvider, startOAuth } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return NextResponse.json({ error: "Unknown identity provider" }, { status: 404 });
  return startOAuth(request, provider);
}
