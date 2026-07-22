import { NextRequest, NextResponse } from "next/server";
import { finishOAuth, isOAuthProvider } from "../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return NextResponse.json({ error: "Unknown identity provider" }, { status: 404 });
  return finishOAuth(request, provider, request.nextUrl.searchParams);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return NextResponse.json({ error: "Unknown identity provider" }, { status: 404 });
  const form = await request.formData();
  const input = new URLSearchParams();
  for (const [key, value] of form.entries()) if (typeof value === "string") input.set(key, value);
  return finishOAuth(request, provider, input);
}
