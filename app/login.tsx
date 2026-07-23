"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

type Tab = "player" | "staff";
type Mode = "login" | "register" | "forgot" | "reset" | "two_factor";

const MicrosoftMark = () => <span className="provider-mark microsoft"><i/><i/><i/><i/></span>;
const GoogleMark = () => <span className="provider-mark google">G</span>;
const AppleMark = () => <span className="provider-mark apple">●</span>;

export function Login({ initialMode = "login", initialTab = "player", initialError, initialReferralCode = "" }: { initialMode?: "login" | "register"; initialTab?: Tab; initialError?: string; initialReferralCode?: string }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [mode, setMode] = useState<Mode>(initialTab === "staff" ? "login" : initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");

  function switchTab(next: Tab) {
    setTab(next);
    setMode("login");
    setError(null);
    setNotice(null);
  }

  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "register" && password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      let payload: Record<string, unknown>;
      if (mode === "register") payload = { action: "register", email, password, displayName, ageConfirmed, referralCode: initialReferralCode };
      else if (mode === "forgot") payload = { action: "forgot_password", email };
      else if (mode === "reset") payload = { action: "reset_password", challengeId, code, password };
      else if (mode === "two_factor") payload = { action: "verify_login_2fa", challengeId, code };
      else payload = { action: "login", email, password, ...(tab === "staff" ? { expectedRole: "staff" } : {}) };
      const res = await fetch("/api/auth", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Something went wrong");
      if (mode === "forgot") {
        setChallengeId(String(result.challengeId ?? ""));
        setPreviewCode(String(result.previewCode ?? ""));
        if (result.challengeId) setMode("reset");
        setNotice(String(result.message ?? "Check your email for the security code."));
        return;
      }
      if (mode === "reset") {
        setNotice(String(result.message ?? "Password reset. You can sign in now."));
        setPassword(""); setConfirmPassword(""); setCode(""); setChallengeId(""); setPreviewCode("");
        changeMode("login");
        return;
      }
      if (result.requiresTwoFactor) {
        setChallengeId(String(result.challengeId ?? ""));
        setPreviewCode(String(result.previewCode ?? ""));
        setNotice(String(result.message ?? "Enter the code sent to your email."));
        setMode("two_factor");
        return;
      }
      const staffRole = ["support", "game_ops", "finance", "admin", "super_admin"].includes(String(result.role));
      window.location.replace(staffRole ? "/admin" : "/");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  const heading = mode === "two_factor" ? "Confirm it is you" : tab === "staff" ? "Staff sign in" : mode === "register" ? "Create your player ID" : mode === "forgot" ? "Forgot your password?" : mode === "reset" ? "Enter your security code" : "Welcome back";
  const subtitle = mode === "two_factor" ? `Enter the one-time code sent to ${email}.` : tab === "staff" ? "Authorized operations access for DreamFyre staff." : mode === "register" ? "Create one secure ID for your games, wallet and support." : mode === "forgot" ? "We will send a six-digit reset code to your registered email." : mode === "reset" ? `Enter the code sent to ${email}.` : "Sign in to continue to your DreamFyre player dashboard.";

  const referralQuery = initialReferralCode ? `?ref=${encodeURIComponent(initialReferralCode)}` : "";
  return <div className="auth-shell auth-shell-v2"><div className="auth-backdrop" aria-hidden="true"/><Link href="/" className="auth-home-link"><ArrowLeft/>Back to DreamFyre</Link><div className="auth-card auth-card-v2"><div className="auth-brand"><div className="auth-brand-art"><Image src="/dreamfyre-logo-transparent.webp" alt="DreamFyre" fill sizes="400px" priority/></div></div><div className="auth-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === "player"} className={tab === "player" ? "active" : ""} onClick={() => switchTab("player")}><UserRound/>Player</button><button type="button" role="tab" aria-selected={tab === "staff"} className={tab === "staff" ? "active" : ""} onClick={() => switchTab("staff")}><ShieldCheck/>Staff</button></div><div className="auth-heading"><h1>{heading}</h1><p>{subtitle}</p>{mode === "register" && initialReferralCode && <span className="auth-invite"><Check/>Invitation connected</span>}</div>{tab === "player" && ["login", "register"].includes(mode) && <><div className="social-auth-grid"><Link href={`/api/oauth/google${referralQuery}`}><GoogleMark/><span>Continue with Google</span></Link><Link href={`/api/oauth/apple${referralQuery}`}><AppleMark/><span>Continue with Apple</span></Link><Link href={`/api/oauth/microsoft${referralQuery}`}><MicrosoftMark/><span>Continue with Microsoft</span></Link></div><div className="auth-divider"><span>or continue with email</span></div></>}
      <form className="form-stack auth-form-v2" onSubmit={submit}>
        {mode === "register" && <label className="field"><span>Display name</span><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" autoComplete="name" maxLength={60}/></label>}
        {mode !== "reset" && <label className="field"><span>Email address</span><div className="input-icon input-icon-right"><span className="input-icon-badge"><Mail/></span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email"/></div></label>}
        {["reset", "two_factor"].includes(mode) && <label className="field"><span>Six-digit security code</span><div className="input-icon"><KeyRound/><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" autoComplete="one-time-code"/></div>{previewCode && <small className="auth-preview-code">Testing code: <strong>{previewCode}</strong></small>}</label>}
        {["login", "register", "reset"].includes(mode) && <label className="field"><span>{mode === "reset" ? "New password" : "Password"}</span><div className="input-icon auth-password"><LockKeyhole/><input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "Your password" : "At least 8 characters"} minLength={mode === "login" ? undefined : 8} autoComplete={mode === "login" ? "current-password" : "new-password"}/><button type="button" className="auth-visibility" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>}
        {mode === "register" && <label className="field"><span>Confirm password</span><input required type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" autoComplete="new-password"/></label>}
        {mode === "register" && <label className="auth-consent"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)}/><span><i>{ageConfirmed && <Check/>}</i>I confirm I am 21+ (or meet the legal age where I live) and accept the <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</span></label>}
        {mode === "login" && tab === "player" && <button className="forgot-link" type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>}
        {error && <div className="auth-error">{error}</div>}{notice && <div className="auth-success"><Check/>{notice}</div>}
        <button className="primary full auth-submit" disabled={loading || (mode === "register" && !ageConfirmed)}>{loading ? "Please wait…" : mode === "register" ? "Create player ID" : mode === "forgot" ? "Send security code" : mode === "reset" ? "Reset password" : mode === "two_factor" ? "Verify & sign in" : "Sign in"}<ArrowRight/></button>
      </form>
      {tab === "player" && ["login", "register"].includes(mode) && <button type="button" className="auth-switch" onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New to DreamFyre? Create your player ID" : "Already have an account? Sign in"}</button>}
      {["forgot", "reset", "two_factor"].includes(mode) && <button type="button" className="auth-switch" onClick={() => changeMode("login")}><ArrowLeft/>Back to sign in</button>}
      {tab === "staff" && <p className="auth-note"><ShieldCheck/>Staff accounts are created by a DreamFyre super administrator. Players cannot use the staff portal.</p>}
    </div><p className="auth-security-line"><LockKeyhole/>Secure session · encrypted credentials · audited staff actions</p></div>;
}
