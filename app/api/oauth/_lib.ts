import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { initializeSchema } from "../_lib/schema";
import { getRuntimeEnv } from "../_lib/runtime";
import { createSession, hashPassword, id, now, restoreExpiredSelfExclusion, setSessionCookie } from "../_lib/session";
import { attachReferral, REFERRAL_COOKIE } from "../_lib/referrals";

export type OAuthProvider = "google" | "apple" | "microsoft";

type ProviderConfig = {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  issuer?: string;
  scope: string;
  responseMode?: string;
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "apple" || value === "microsoft";
}

function providerConfig(provider: OAuthProvider): ProviderConfig | null {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
    return clientId && clientSecret ? { name: "Google", clientId, clientSecret, authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth", tokenEndpoint: "https://oauth2.googleapis.com/token", jwksEndpoint: "https://www.googleapis.com/oauth2/v3/certs", issuer: "https://accounts.google.com", scope: "openid email profile" } : null;
  }
  if (provider === "microsoft") {
    const clientId = process.env.MICROSOFT_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim() ?? "";
    return clientId && clientSecret ? { name: "Microsoft", clientId, clientSecret, authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token", jwksEndpoint: "https://login.microsoftonline.com/common/discovery/v2.0/keys", scope: "openid email profile" } : null;
  }
  const clientId = process.env.APPLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.APPLE_CLIENT_SECRET?.trim() ?? "";
  return clientId && clientSecret ? { name: "Apple", clientId, clientSecret, authorizationEndpoint: "https://appleid.apple.com/auth/authorize", tokenEndpoint: "https://appleid.apple.com/auth/token", jwksEndpoint: "https://appleid.apple.com/auth/keys", issuer: "https://appleid.apple.com", scope: "name email", responseMode: "form_post" } : null;
}

function randomUrlSafe(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(value).toString("base64url");
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}

function callbackUrl(request: NextRequest, provider: OAuthProvider) {
  return `${request.nextUrl.origin}/api/oauth/${provider}/callback`;
}

function authError(request: NextRequest, message: string) {
  const url = new URL("/auth", request.nextUrl.origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function startOAuth(request: NextRequest, provider: OAuthProvider) {
  const config = providerConfig(provider);
  if (!config) return authError(request, `${provider[0].toUpperCase()}${provider.slice(1)} sign-in is waiting for the operator credentials.`);
  const env = await getRuntimeEnv();
  await initializeSchema(env.DB);
  const state = randomUrlSafe();
  const verifier = randomUrlSafe(48);
  const nonce = randomUrlSafe(24);
  const created = now();
  await env.DB.prepare("INSERT INTO oauth_states (state,provider,code_verifier,nonce,expires_at,created_at) VALUES (?,?,?,?,?,?)")
    .bind(state, provider, verifier, nonce, new Date(Date.now() + 10 * 60 * 1000).toISOString(), created).run();
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(request, provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", await pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  if (config.responseMode) url.searchParams.set("response_mode", config.responseMode);
  if (provider === "google") url.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(url);
  const referralCode = request.nextUrl.searchParams.get("ref")?.trim().slice(0, 40);
  if (referralCode) response.cookies.set(REFERRAL_COOKIE, referralCode, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 10 * 60 });
  return response;
}

async function verifiedIdentity(config: ProviderConfig, idToken: string, nonce: string) {
  const verification = await jwtVerify(idToken, createRemoteJWKSet(new URL(config.jwksEndpoint)), {
    audience: config.clientId,
    ...(config.issuer ? { issuer: config.issuer } : {}),
  });
  const payload: JWTPayload = verification.payload;
  if (payload.nonce && payload.nonce !== nonce) throw new Error("Identity nonce did not match");
  const email = String(payload.email ?? payload.preferred_username ?? "").trim().toLowerCase();
  const subject = String(payload.sub ?? "");
  const name = String(payload.name ?? email.split("@")[0] ?? "Player").trim().slice(0, 60);
  if (!email || !subject) throw new Error("The identity provider did not return a verified email");
  return { email, subject, name };
}

export async function finishOAuth(request: NextRequest, provider: OAuthProvider, input: URLSearchParams) {
  try {
    const config = providerConfig(provider);
    if (!config) return authError(request, `${provider} sign-in is not configured.`);
    const stateValue = input.get("state") ?? "";
    const code = input.get("code") ?? "";
    const providerError = input.get("error");
    if (providerError) return authError(request, `Sign-in was cancelled: ${providerError}`);
    if (!stateValue || !code) return authError(request, "The identity response was incomplete. Please try again.");
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    const state = await env.DB.prepare("SELECT * FROM oauth_states WHERE state=? AND provider=?").bind(stateValue, provider).first<Record<string, string>>();
    if (!state || state.expires_at < now()) return authError(request, "This sign-in attempt expired. Please try again.");
    await env.DB.prepare("DELETE FROM oauth_states WHERE state=?").bind(stateValue).run();
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(request, provider), client_id: config.clientId, client_secret: config.clientSecret, code_verifier: state.code_verifier }),
    });
    const tokens = await tokenResponse.json() as { id_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokens.id_token) throw new Error(tokens.error_description ?? "The identity provider could not complete sign-in");
    const identity = await verifiedIdentity(config, tokens.id_token, state.nonce);
    let user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(identity.email).first<Record<string, string>>();
    const created = now();
    let createdPlayer = false;
    if (!user) {
      const userId = id("usr");
      const playerTag = `DFPlayer_${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
      const referralCode = `DF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const unusablePassword = await hashPassword(randomUrlSafe(40));
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id,email,display_name,player_tag,role,status,referral_code,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(userId, identity.email, identity.name, playerTag, "player", "active", referralCode, created),
        env.DB.prepare("INSERT INTO credentials (user_id,password_hash,created_at) VALUES (?,?,?)").bind(userId, unusablePassword, created),
        env.DB.prepare("INSERT INTO wallets (user_id,cash_balance,freeplay_balance,referral_balance,reserved_balance,updated_at) VALUES (?,?,?,?,?,?)").bind(userId, 0, 0, 0, 0, created),
        env.DB.prepare("INSERT INTO user_profiles (user_id,age_confirmed,email_verified,updated_at) VALUES (?,0,1,?)").bind(userId, created),
        env.DB.prepare("INSERT INTO security_settings (user_id,two_factor_enabled,suspension_requested,updated_at) VALUES (?,0,0,?)").bind(userId, created),
        env.DB.prepare("INSERT INTO notifications (id,user_id,notification_type,title,message,created_at) VALUES (?,?,?,?,?,?)").bind(id("note"), userId, "account", "Identity connected", `${config.name} sign-in was connected. Confirm your age in Profile before using restricted features.`, created),
      ]);
      user = { id: userId, email: identity.email, display_name: identity.name, player_tag: playerTag, role: "player", status: "active", referral_code: referralCode, created_at: created };
      createdPlayer = true;
    }
    await restoreExpiredSelfExclusion(env.DB, user);
    if (user.status !== "active") return authError(request, "This DreamFyre account is not active.");
    await env.DB.prepare("INSERT INTO oauth_accounts (provider,provider_account_id,user_id,email,created_at) VALUES (?,?,?,?,?) ON CONFLICT(provider,provider_account_id) DO UPDATE SET user_id=excluded.user_id,email=excluded.email")
      .bind(provider, identity.subject, user.id, identity.email, created).run();
    await env.DB.prepare("UPDATE user_profiles SET email_verified=1,updated_at=? WHERE user_id=?").bind(created, user.id).run();
    if (createdPlayer) await attachReferral(env.DB, identity.email, request.cookies.get(REFERRAL_COOKIE)?.value);
    const token = await createSession(env.DB, user.id, user.role);
    const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
    setSessionCookie(response, request, token);
    response.cookies.set(REFERRAL_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return authError(request, error instanceof Error ? error.message : "Social sign-in failed");
  }
}
