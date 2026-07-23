"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { animate } from "animejs";
import {
  ArrowDownToLine, ArrowRight, ArrowUpFromLine, Bell, Bitcoin, Camera, Check, ChevronRight, CircleDollarSign, Clock3, Copy, CreditCard,
  Award, ChevronLeft, Coins, Crown, Eye, EyeOff, ExternalLink, Gamepad2, Gift, Headphones, Heart, KeyRound, LayoutDashboard, LifeBuoy, ListChecks, Mail,
  Landmark, LockKeyhole, LogOut, Menu, MessageCircle, Play, Plus, RefreshCw, RotateCw, Search, Send, Settings, ShieldCheck, ShoppingBag,
  Smartphone, Sparkles, Star, Ticket, Upload, UserRound, Users, WalletCards, X, Zap,
} from "lucide-react";
import { Login } from "./login";
import { AccountCenter } from "./account-center";
import { GAME_CATALOG } from "./lib/game-catalog";

type View = "dashboard" | "games" | "explore" | "deposit" | "wallet" | "withdraw" | "transfer" | "referrals" | "support" | "profile";
type Game = { id: string; name: string; shortName: string; accent: string; apiStatus: string; launchUrl?: string };
type GameAccount = { id: string; gameId: string; gameName: string; accent: string; username: string; password?: string; status: string; balance: number; balanceUpdatedAt: string; launchUrl?: string };
type Tx = { id: string; type: string; description: string; amount: number; status: string; createdAt: string };
type GameRequest = { id: string; requestType: "account" | "credit" | "password_reset" | "credit_withdrawal"; gameId: string; gameName: string; amount: number; gameUsername?: string; status: string; staffNote?: string; providerReference?: string; createdAt: string; updatedAt: string };
type EngagementAction = { actionKey: string; rewardType: string; rewardAmount: number; createdAt: string };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Snapshot = {
  user: { displayName: string; email: string; playerTag: string; referralCode: string; role: string; avatarUrl?: string | null; ageConfirmed?: boolean; emailVerified?: boolean };
  wallet: { cashBalance: number; freeplayBalance: number; referralBalance: number; reservedBalance: number };
  games: Game[]; gameAccounts: GameAccount[]; gameRequests: GameRequest[]; transactions: Tx[];
  withdrawals: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
  referrals: Array<{ id: string; referredEmail: string; status: string; reward: number; createdAt: string }>;
  supportMessages: Array<{ id: string; senderRole: string; message: string; createdAt: string }>;
  engagement: { actions: EngagementAction[]; favoriteGameIds: string[]; lifetimeVolume: number };
  paymentMethods: Array<{ id: string; name: string; methodType: string; network?: string; instructions?: string; destination?: string; paymentUrl?: string; qrImageUrl?: string }>;
  supportChannels: Array<{ id: string; label: string; channelType: string; destination: string }>;
  notifications: Array<{ id: string; notificationType: string; title: string; message: string; readAt?: string; createdAt: string }>;
};

type GamePresentation = { logo?: string; category: string; description: string };

const gamePresentation = Object.fromEntries(GAME_CATALOG.map((game) => [game.id, {
  logo: game.image,
  category: game.category.toUpperCase(),
  description: game.description,
}])) as Record<string, GamePresentation>;
const gameOrder = GAME_CATALOG.map((game) => game.id);
const fallback: Snapshot = {
  user: { displayName: "Player", email: "", playerTag: "", referralCode: "", role: "player" },
  wallet: { cashBalance: 0, freeplayBalance: 0, referralBalance: 0, reservedBalance: 0 },
  games: GAME_CATALOG.map(({ id, name, shortName, accent }) => ({ id, name, shortName, accent, apiStatus: "staff_processed" })),
  gameAccounts: [], gameRequests: [],
  transactions: [],
  withdrawals: [], referrals: [], supportMessages: [], engagement: { actions: [], favoriteGameIds: [], lifetimeVolume: 0 },
  paymentMethods: [
    { id: "venmo", name: "Venmo", methodType: "wallet" }, { id: "paypal", name: "PayPal", methodType: "wallet" }, { id: "chime", name: "Chime", methodType: "wallet" },
    { id: "stripe", name: "Stripe", methodType: "gateway" }, { id: "google-pay", name: "Google Pay", methodType: "wallet" }, { id: "apple-pay", name: "Apple Pay", methodType: "wallet" },
    { id: "cash-app", name: "Cash App", methodType: "wallet" }, { id: "card", name: "Card Payment", methodType: "card" }, { id: "btc", name: "BTC", methodType: "crypto", network: "Bitcoin" }, { id: "usdt-trc20", name: "USDT (TRC20)", methodType: "crypto", network: "TRON (TRC20)" },
  ],
  supportChannels: [],
  notifications: [],
};

const nav: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard }, { id: "games", label: "Games", icon: Gamepad2 },
  { id: "explore", label: "Rewards", icon: Sparkles },
  { id: "deposit", label: "Deposit", icon: ArrowDownToLine }, { id: "wallet", label: "Wallet", icon: WalletCards },
  { id: "support", label: "Support", icon: LifeBuoy },
];

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const niceDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
const isoDay = (date = new Date()) => date.toISOString().slice(0, 10);
const isoMonth = (date = new Date()) => date.toISOString().slice(0, 7);
const isoWeek = (date = new Date()) => { const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); copy.setUTCDate(copy.getUTCDate() - ((copy.getUTCDay() + 6) % 7)); return copy.toISOString().slice(0, 10); };
const playerAccountStatus = (value: string) => ({ pending_staff: "creating account", processing: "securing login", completed: "ready", rejected: "needs attention" }[value] ?? value.replaceAll("_", " "));
const notificationItems = (data: Snapshot) => [
  ...data.notifications.map((item) => ({ id: item.id, title: item.title, text: item.message, time: item.createdAt })),
  ...data.gameRequests.slice(0, 3).map((request) => ({ id: request.id, title: `${request.gameName} request`, text: request.requestType === "account" ? `Status: ${playerAccountStatus(request.status)}` : request.staffNote || `Status: ${request.status.replaceAll("_", " ")}`, time: request.updatedAt })),
  ...data.withdrawals.slice(0, 2).map((request) => ({ id: request.id, title: "Cashout update", text: `${money(request.amount)} · ${request.status.replaceAll("_", " ")}`, time: request.createdAt })),
  ...data.transactions.slice(0, 3).map((tx) => ({ id: tx.id, title: tx.description, text: `${money(Math.abs(tx.amount))} · ${tx.status.replaceAll("_", " ")}`, time: tx.createdAt })),
].slice(0, 7);

export function PlayerPlatform({ initialAuthenticated = false }: { initialAuthenticated?: boolean }) {
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "guest">(initialAuthenticated ? "authenticated" : "checking");
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<Snapshot>(fallback);
  const [dataReady, setDataReady] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [selectedGameId, setSelectedGameId] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    setPortalError("");
    try {
      const res = await fetch("/api/platform", { credentials: "include", cache: "no-store" });
      if (res.status === 401) { setAuthState("guest"); setDataReady(false); return; }
      if (res.status === 403) { window.location.replace("/admin"); return; }
      if (!res.ok) throw new Error("Your account data could not be loaded.");
      setData(await res.json());
      setDataReady(true);
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : "Your account data could not be loaded.");
    }
  }
  async function logout() {
    try { await fetch("/api/auth", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); }
    finally { setData(fallback); setDataReady(false); setPortalError(""); setView("dashboard"); setAuthState("guest"); }
  }
  useEffect(() => {
    if (initialAuthenticated) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    fetch("/api/auth", { credentials: "include", cache: "no-store", signal: controller.signal }).then((res) => res.ok ? res.json() : { authenticated: false }).then((result) => {
      if (!active) return;
      if (result.authenticated && ["support", "game_ops", "finance", "admin", "super_admin"].includes(String(result.role))) {
        window.location.replace("/admin");
        return;
      }
      setAuthState(result.authenticated ? "authenticated" : "guest");
    }).catch(() => { if (active) setAuthState("guest"); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [initialAuthenticated]);
  useEffect(() => {
    if (authState !== "authenticated") return;
    let active = true;
    fetch("/api/platform", { credentials: "include", cache: "no-store" }).then((res) => {
      if (res.status === 401) { if (active) { setAuthState("guest"); setDataReady(false); } return null; }
      if (res.status === 403) { window.location.replace("/admin"); return null; }
      if (!res.ok) throw new Error("Your account data could not be loaded.");
      return res.json();
    }).then((next) => { if (active && next) { setData(next); setDataReady(true); setPortalError(""); } }).catch((error) => { if (active) setPortalError(error instanceof Error ? error.message : "Your account data could not be loaded."); });
    return () => { active = false; };
  }, [authState]);
  const hasOpenRequests = data.gameRequests.some((request) => !["completed", "rejected"].includes(request.status));
  useEffect(() => {
    if (authState !== "authenticated" || (!hasOpenRequests && view !== "support")) return;
    const timer = window.setInterval(() => { void refresh(); }, hasOpenRequests ? 3500 : 6500);
    return () => window.clearInterval(timer);
  }, [authState, hasOpenRequests, view]);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const close = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [profileMenuOpen]);
  useEffect(() => {
    if (!mainRef.current) return;
    const targets = Array.from(mainRef.current.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((target) => { target.style.opacity = "1"; });
      return;
    }
    const revealed = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || revealed.has(entry.target)) return;
        revealed.add(entry.target);
        observer.unobserve(entry.target);
        animate(entry.target, { opacity: [0, 1], translateY: [20, 0], delay: 40, duration: 560, ease: "out(4)" });
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px" });
    targets.forEach((target) => { target.style.opacity = "0"; observer.observe(target); });
    return () => observer.disconnect();
  }, [view]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => undefined);
    }
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function action(payload: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/platform", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (res.status === 401) { setAuthState("guest"); return {}; }
      if (res.status === 403) { window.location.replace("/admin"); return {}; }
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Request failed");
      setToast(result.message ?? "Saved successfully"); await refresh(); return result;
    } catch (error) { setToast(error instanceof Error ? error.message : "Unable to complete request"); return {}; }
    finally { setLoading(false); }
  }

  async function installApp() {
    if (!installPrompt) { setToast("Open your browser menu and choose Add to Home Screen."); return; }
    await installPrompt.prompt(); const result = await installPrompt.userChoice;
    setToast(result.outcome === "accepted" ? "DreamFyre installation started." : "Installation was dismissed.");
    setInstallPrompt(null);
  }

  const content = {
    dashboard: <Dashboard data={data} go={setView} action={action} />,
    games: <Games data={data} action={action} loading={loading} go={(target, gameId) => { if (gameId) setSelectedGameId(gameId); setView(target); }} />,
    explore: <Explore data={data} action={action} loading={loading} go={setView} />,
    deposit: <Deposit data={data} action={action} loading={loading} initialGameId={selectedGameId} />,
    wallet: <Wallet data={data} go={setView} />,
    withdraw: <Withdraw data={data} action={action} loading={loading} />,
    transfer: <Transfer data={data} action={action} loading={loading} />,
    referrals: <Referrals data={data} toast={setToast} />,
    support: <Support data={data} action={action} loading={loading} />,
    profile: <Profile data={data} installApp={installApp} go={setView} />,
  }[view];
  const notifications = notificationItems(data);

  // Render a useful first screen while the session check runs. This keeps the
  // portal usable even if a browser extension or weak connection delays auth.
  if (authState === "checking") return <div className="auth-loading">Loading your player portal…</div>;
  if (authState !== "authenticated") return <Login />;
  if (!dataReady) return <div className="portal-load-state"><div className="account-creation-loader-small"><RefreshCw className={!portalError ? "spin" : ""}/></div><h1>{portalError ? "Portal temporarily unavailable" : "Loading your secure account"}</h1><p>{portalError || "Retrieving your wallet, games and account activity…"}</p>{portalError && <div><button className="primary" onClick={() => void refresh()}><RefreshCw/>Try again</button><button className="secondary" onClick={() => void logout()}><LogOut/>Log out</button></div>}</div>;

  return (
    <div className="app-shell">
      <div className="noise" aria-hidden="true" />
      <Sidebar view={view} setView={(v) => { setView(v); setMobileOpen(false); }} open={mobileOpen} close={() => setMobileOpen(false)} />
      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="top-wordmark" aria-label="DreamFyre"><div className="compact-brand-art"><Image src="/dreamfyre-logo-v2.webp" alt="DreamFyre" fill sizes="190px" priority unoptimized /></div></div>
          <GlobalSearch data={data} go={setView}/>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}><Bell size={18} />{notifications.length > 0 && <span className="notification-dot" />}</button>
            <div className="balance-chip"><span>Available</span><strong>{money(data.wallet.cashBalance)}</strong></div>
            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button className="user-chip" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}><PlayerAvatar user={data.user}/><div><strong>{data.user.displayName}</strong><small>DreamFyre player</small></div><ChevronRight className={profileMenuOpen ? "profile-chevron open" : "profile-chevron"} size={14}/></button>
              {profileMenuOpen && <div className="profile-dropdown" role="menu"><div><PlayerAvatar user={data.user} dropdown/><p><strong>{data.user.displayName}</strong><small>{data.user.email}</small></p></div><button role="menuitem" onClick={() => { setView("profile"); setProfileMenuOpen(false); }}><Settings/><span><strong>Settings & profile</strong><small>Security and app options</small></span></button><button className="profile-logout" role="menuitem" onClick={logout}><LogOut/><span><strong>Log out</strong><small>End this secure session</small></span></button></div>}
            </div>
          </div>
        </header>
        <main className="content" ref={mainRef}>{content}</main>
      </div>
      <MobileBottomNav view={view} go={setView}/>
      <NotificationDrawer open={notificationsOpen} close={() => setNotificationsOpen(false)} items={notifications} go={(target) => { setNotificationsOpen(false); setView(target); }} />
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function MobileBottomNav({ view, go }: { view: View; go: (view: View) => void }) {
  const items: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard }, { id: "games", label: "Games", icon: Gamepad2 },
    { id: "deposit", label: "Deposit", icon: ArrowDownToLine }, { id: "wallet", label: "Wallet", icon: WalletCards }, { id: "profile", label: "Profile", icon: UserRound },
  ];
  return <nav className="mobile-bottom-nav" aria-label="Mobile player navigation">{items.map(({ icon: Icon, ...item }) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => go(item.id)}><Icon/><span>{item.label}</span></button>)}</nav>;
}

function Sidebar({ view, setView, open, close }: { view: View; setView: (v: View) => void; open: boolean; close: () => void }) {
  return <><div className={`scrim ${open ? "show" : ""}`} onClick={close} />
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand"><div className="sidebar-brand-art"><Image src="/dreamfyre-mark-v2.webp" alt="DreamFyre" fill sizes="64px" priority unoptimized /></div><button className="icon-btn close-nav" onClick={close}><X size={18} /></button></div>
      <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon size={18} /><span>{label}</span>{view === id && <ChevronRight size={14} />}</button>)}</nav>
      <div className="sidebar-trust"><ShieldCheck size={19} /><div><strong>Protected activity</strong><span>Encrypted ledger & audit logs</span></div></div>
    </aside></>;
}

function PageHead({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="page-head" data-reveal><div><p className="eyebrow">DreamFyre player network</p><h2>{title}</h2><p>{text}</p></div>{action}</div>;
}
function PlayerAvatar({ user, dropdown = false }: { user: Snapshot["user"]; dropdown?: boolean }) {
  const initials = user.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase() || "DF";
  return <span className={dropdown ? "profile-dropdown-avatar player-avatar-image" : "player-avatar-image"}>{user.avatarUrl ? <Image src={user.avatarUrl} alt="" fill sizes={dropdown ? "38px" : "42px"} unoptimized/> : initials}</span>;
}
function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) { return <section className={`card ${className}`} id={id} data-reveal>{children}</section>; }
function Status({ value, label }: { value: string; label?: string }) { const ok = value === "completed" || value === "active" || value === "ready" || value === "staff_processed"; return <span className={`status ${ok ? "ok" : value.includes("pending") || value.includes("review") ? "pending" : "neutral"}`}>{label ?? (value === "staff_processed" ? "available" : value.replaceAll("_", " "))}</span>; }

function NotificationDrawer({ open, close, items, go }: { open: boolean; close: () => void; items: Array<{ id: string; title: string; text: string; time: string }>; go: (target: View) => void }) {
  return <><button className={`notification-scrim ${open ? "show" : ""}`} onClick={close} aria-label="Close notifications" /><aside className={`notification-panel ${open ? "open" : ""}`} aria-hidden={!open}><div className="notification-head"><div><span>PLAYER UPDATES</span><h3>Notifications</h3></div><button className="icon-btn" onClick={close} aria-label="Close notifications"><X /></button></div><div className="notification-list">{items.length ? items.map((item) => <article key={`${item.id}-${item.title}`}><span><Bell /></span><div><strong>{item.title}</strong><p>{item.text}</p><small>{niceDate(item.time)}</small></div></article>) : <div className="notification-empty"><Bell /><strong>You&apos;re all caught up</strong><p>Account, credit and cashout updates appear here.</p></div>}</div><div className="notification-actions"><button className="secondary" onClick={() => go("wallet")}><Clock3 />Activity</button><button className="primary" onClick={() => go("support")}><MessageCircle />Support</button></div></aside></>;
}

function GlobalSearch({ data, go }: { data: Snapshot; go: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const normalized = query.trim().toLowerCase();
  const gameResults = normalized ? data.games.filter((game) => `${game.name} ${gamePresentation[game.id]?.category ?? ""}`.toLowerCase().includes(normalized)).slice(0, 5) : [];
  const transactionResults = normalized ? data.transactions.filter((transaction) => transaction.description.toLowerCase().includes(normalized)).slice(0, 3) : [];
  const pages = normalized ? [
    { label: "Rewards & promotions", keywords: "bonus reward promotion roulette freeplay", view: "explore" as View, icon: Gift },
    { label: "Support & FAQs", keywords: "help support faq whatsapp email", view: "support" as View, icon: LifeBuoy },
    { label: "Wallet & transactions", keywords: "wallet transaction history balance", view: "wallet" as View, icon: WalletCards },
    { label: "Profile & security", keywords: "profile password security verification kyc", view: "profile" as View, icon: ShieldCheck },
  ].filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(normalized)) : [];
  const hasResults = gameResults.length + transactionResults.length + pages.length > 0;
  function open(view: View) { go(view); setQuery(""); setFocused(false); }
  return <div className="global-search-wrap"><label className="global-search"><Search/><input aria-label="Search DreamFyre" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} placeholder="Search games, activity, help..."/><kbd>⌘ K</kbd></label>{focused && normalized && <><button className="search-dismiss" onClick={() => setFocused(false)} aria-label="Close search"/><div className="global-search-results">{gameResults.length > 0 && <section><span>GAMES</span>{gameResults.map((game) => <button key={game.id} onClick={() => open("games")}><GameAvatar id={game.id} name={game.name} color={game.accent}/><div><strong>{game.name}</strong><small>{gamePresentation[game.id]?.category}</small></div><ChevronRight/></button>)}</section>}{transactionResults.length > 0 && <section><span>ACTIVITY</span>{transactionResults.map((transaction) => <button key={transaction.id} onClick={() => open("wallet")}><Clock3/><div><strong>{transaction.description}</strong><small>{niceDate(transaction.createdAt)}</small></div><ChevronRight/></button>)}</section>}{pages.length > 0 && <section><span>PAGES</span>{pages.map(({ icon: Icon, ...page }) => <button key={page.view} onClick={() => open(page.view)}><Icon/><div><strong>{page.label}</strong><small>Open player portal page</small></div><ChevronRight/></button>)}</section>}{!hasResults && <div className="search-empty"><Search/><strong>No results for “{query}”</strong><span>Try a game, wallet, rewards, verification or support.</span></div>}</div></>}</div>;
}

function GameSlider({ games, accounts = [], pendingGameIds = [], go, selectedId, onSelect, autoplay = true, favoriteGameIds = [], onToggleFavorite }: { games: Game[]; accounts?: GameAccount[]; pendingGameIds?: string[]; go?: (v: View) => void; selectedId?: string; onSelect?: (id: string) => void; autoplay?: boolean; favoriteGameIds?: string[]; onToggleFavorite?: (gameId: string) => void }) {
  const displayGames = useMemo(() => [...games].sort((left, right) => gameOrder.indexOf(left.id) - gameOrder.indexOf(right.id)), [games]);
  const initial = Math.max(0, displayGames.findIndex((game) => game.id === selectedId));
  const [active, setActive] = useState(initial);
  const [paused, setPaused] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const activeGame = displayGames[active] ?? displayGames[0];

  const moveTo = useCallback((index: number) => {
    const next = (index + displayGames.length) % displayGames.length;
    setActive(next);
    onSelect?.(displayGames[next].id);
    railRef.current?.querySelector<HTMLElement>(`[data-game-index="${next}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [displayGames, onSelect]);

  useEffect(() => {
    if (!autoplay || paused || displayGames.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => moveTo((active + 1) % displayGames.length), 5200);
    return () => window.clearInterval(timer);
  }, [active, autoplay, displayGames.length, moveTo, paused]);

  if (!activeGame) return null;

  return <div className="game-browser" style={{ "--slider-accent": activeGame.accent } as React.CSSProperties} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <div className="game-browser-head"><div><span className="slider-kicker"><i/>LIVE GAME DIRECTORY</span><h3>Choose your next casino</h3><p>Swipe through clean, full-colour game artwork</p></div><div className="slider-nav"><span><b>{String(active + 1).padStart(2,"0")}</b> / {String(displayGames.length).padStart(2,"0")}</span><button onClick={() => moveTo(active - 1)} aria-label="Previous games"><ChevronLeft/></button><button onClick={() => moveTo(active + 1)} aria-label="Next games"><ChevronRight/></button></div></div>
    <div className="game-browser-rail" ref={railRef}>{displayGames.map((game,index) => { const account = accounts.find((item) => item.gameId === game.id); const pending = pendingGameIds.includes(game.id); const selected = index === active || selectedId === game.id; return <article key={game.id} data-game-index={index} className={selected ? "active" : ""} style={{ "--game": game.accent } as React.CSSProperties} onClick={() => moveTo(index)}><div className="game-browser-art">{gamePresentation[game.id]?.logo ? <Image src={gamePresentation[game.id].logo!} alt={`${game.name} logo`} fill sizes="(max-width:700px) 68vw, 260px"/> : <GameLogo game={game}/>}<span className="game-browser-state"><i/>{account ? "CONNECTED" : pending ? "CREATING" : "AVAILABLE"}</span>{onToggleFavorite && <button className={favoriteGameIds.includes(game.id) ? "active" : ""} onClick={(event) => { event.stopPropagation(); onToggleFavorite(game.id); }} aria-label={`Favorite ${game.name}`}><Heart fill={favoriteGameIds.includes(game.id) ? "currentColor" : "none"}/></button>}</div><div className="game-browser-copy"><span>{gamePresentation[game.id]?.category ?? "CASINO PLATFORM"}</span><h4>{game.name}</h4><p>{gamePresentation[game.id]?.description}</p></div><footer>{onSelect ? <button className={selectedId === game.id ? "selected" : ""} onClick={(event) => { event.stopPropagation(); onSelect(game.id); }}><Check/>{selectedId === game.id ? "Selected" : "Select"}</button> : <><button disabled={!account} onClick={(event) => { event.stopPropagation(); go?.("deposit"); }}><Coins/>Deposit</button><button className="play" disabled={pending} onClick={(event) => { event.stopPropagation(); go?.("games"); }}><Play/>{account ? "Open" : pending ? "Creating" : "Get account"}</button></>}</footer></article>; })}</div>
    <div className="game-browser-foot"><div>{displayGames.map((game,index) => <button key={game.id} className={index === active ? "active" : ""} onClick={() => moveTo(index)} aria-label={`Show ${game.name}`}/>)}</div><span><ShieldCheck/>{accounts.length} connected · {displayGames.length} available</span></div>
  </div>;
}

function Dashboard({ data, go, action }: { data: Snapshot; go: (v: View) => void; action: (p: Record<string, unknown>) => Promise<unknown> }) {
  const pendingAccountRequests = data.gameRequests.filter((request) => request.requestType === "account" && !["completed", "rejected"].includes(request.status));
  const addedGameIds = new Set([...data.gameAccounts.map((account) => account.gameId), ...pendingAccountRequests.map((request) => request.gameId)]);
  const homeGames = data.games.filter((game) => addedGameIds.has(game.id));
  const heroGames = homeGames.filter((game) => gamePresentation[game.id]?.logo).slice(0, 5);
  return <div className="command-dashboard">
    <div className="dashboard-left">
      <section className="launch-hero casino-hero" data-reveal>
        <div className="launch-copy"><span className="live-kicker"><i /> YOUR CASINO COMMAND CENTER</span><h2>ONE WALLET.<br /><em>YOUR GAMES.</em></h2><p>Home shows only the casino accounts you added. Visit My Games whenever you want to add another platform.</p><div className="hero-cta-row"><button className="launch-button cta-green" onClick={() => go("games")}>{homeGames.length ? "OPEN MY GAMES" : "ADD YOUR FIRST GAME"} <ChevronRight /></button></div></div>
        <div className="casino-hero-art" aria-hidden="true"><div className="hero-game-logos">{heroGames.map((game, index) => <div className={`hero-game-logo hero-game-logo-${index}`} key={game.id} title={game.name}><GameAvatar id={game.id} name={game.name} color={game.accent}/></div>)}<span className="hero-logo-count">{homeGames.length} ADDED {homeGames.length === 1 ? "GAME" : "GAMES"}</span></div><div className="slot-cabinet"><small>DREAMFYRE CASINO</small><div><b>{data.gameAccounts.length}</b><b>{pendingAccountRequests.length}</b><b>★</b></div><em>ACTIVE · CREATING · REWARDS</em></div><span className="casino-chip chip-one">DF</span><span className="casino-chip chip-two">7</span><span className="casino-chip chip-three">★</span></div>
      </section>
      <section className="library-panel game-slider-panel" data-reveal>
        {homeGames.length ? <GameSlider games={homeGames} accounts={data.gameAccounts} pendingGameIds={pendingAccountRequests.map((request) => request.gameId)} go={go} favoriteGameIds={data.engagement.favoriteGameIds} onToggleFavorite={(gameId) => { void action({ action: "toggle_game_favorite", gameId }); }} /> : <EmptyGames go={() => go("games")}/>} 
      </section>
      <section className="reward-rail" data-reveal><button onClick={() => go("explore")}><Gift /><span><strong>DAILY REWARDS</strong><small>CLAIM FREEPLAY CREDITS</small></span><ChevronRight /></button><button onClick={() => go("explore")}><ListChecks /><span><strong>WEEKLY MISSIONS</strong><small>COMPLETE AND EARN</small></span><ChevronRight /></button><button onClick={() => go("explore")}><Crown /><span><strong>VIP REWARDS</strong><small>UNLOCK YOUR NEXT TIER</small></span><ChevronRight /></button></section>
    </div>
    <aside className="dashboard-right">
      <section className="wallet-command" data-reveal><span>WALLET BALANCE</span><strong>{money(data.wallet.cashBalance)}</strong><small>{money(data.wallet.freeplayBalance + data.wallet.referralBalance)} rewards available</small><button className="deposit-command" onClick={() => go("deposit")}>DEPOSIT <ChevronRight /></button><div className="wallet-actions"><button onClick={() => go("transfer")}><Send />SEND</button><button onClick={() => go("wallet")}><ArrowDownToLine />RECEIVE</button><button onClick={() => go("wallet")}><Clock3 />HISTORY</button><button onClick={() => go("withdraw")}><ArrowUpFromLine />WITHDRAW</button></div></section>
      <section className="live-panel" data-reveal><div className="grid-heading"><h3><i /> MY CASINO NETWORK</h3><span>LIVE</span></div><div className="casino-live"><span className="live-tag">ONLINE</span><small>YOUR ALL-IN-ONE PLAYER LOBBY</small><div className="casino-live-reels"><b>{data.gameAccounts.length}</b><b>{pendingAccountRequests.length}</b><b>★</b></div><div className="casino-network-stats"><span><strong>{homeGames.length}</strong> added</span><span><strong>{data.gameAccounts.length}</strong> active</span><span><strong>{pendingAccountRequests.length}</strong> creating</span></div></div></section>
      <section className="recent-panel" data-reveal><div className="grid-heading"><h3>RECENT TRANSACTIONS</h3><button onClick={() => go("wallet")}>VIEW ALL</button></div><div className="compact-tx">{data.transactions.slice(0, 4).map((tx) => <div key={tx.id}><span className={tx.amount >= 0 ? "tx-up" : "tx-down"}>{tx.amount >= 0 ? <ArrowDownToLine /> : <ArrowUpFromLine />}</span><p><strong>{tx.description}</strong><small>{niceDate(tx.createdAt)}</small></p><b className={tx.amount >= 0 ? "positive" : "negative"}>{tx.amount >= 0 ? "+" : "-"}{money(Math.abs(tx.amount))}</b><Status value={tx.status} /></div>)}</div></section>
    </aside>
  </div>;
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof WalletCards; accent: string }) { return <Card className={`metric ${accent}`}><div className="metric-icon"><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small>Available now</small></Card>; }
function SectionTitle({ title, link, onClick }: { title: string; link: string; onClick?: () => void }) { return <div className="section-title"><h3>{title}</h3><button onClick={onClick}>{link}<ChevronRight size={14} /></button></div>; }
function EmptyGames({ go }: { go: () => void }) { return <div className="empty"><div><Gamepad2 size={25} /></div><strong>No games added yet</strong><p>Connect your first game account securely.</p><button className="primary compact" onClick={go}><Plus size={15} />Add a game</button></div>; }

function Games({ data, action, loading, go }: { data: Snapshot; action: (p: Record<string, unknown>) => Promise<unknown>; loading: boolean; go: (target: View, gameId?: string) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [savedQuery, setSavedQuery] = useState("");
  const openAccountRequests = data.gameRequests.filter((request) => request.requestType === "account" && !["completed", "rejected"].includes(request.status));
  const rejectedAccountRequests = data.gameRequests.filter((request) => request.requestType === "account" && request.status === "rejected");
  const unavailableGameIds = new Set([...data.gameAccounts.map((account) => account.gameId), ...openAccountRequests.map((request) => request.gameId)]);
  const visibleGames = data.games.filter((game) => game.name.toLowerCase().includes(query.trim().toLowerCase()));
  const normalizedSavedQuery = savedQuery.trim().toLowerCase();
  const visiblePendingRequests = openAccountRequests.filter((request) => request.gameName.toLowerCase().includes(normalizedSavedQuery));
  const visibleAccounts = data.gameAccounts.filter((account) => account.gameName.toLowerCase().includes(normalizedSavedQuery));
  const accountCount = data.gameAccounts.length + openAccountRequests.length;

  async function create() {
    if (!selected) return;
    const result = await action({ action: "create_game_account", gameId: selected }) as { requestId?: string };
    if (result.requestId) {
      setAddOpen(false);
      setSelected("");
      setQuery("");
    }
  }

  return <div className="stack my-games-page">
    <PageHead
      title="My games"
      text="Choose a casino and request your secure player account. Your Game ID and password appear here automatically when the account is ready."
      action={<button className="primary add-games-button" onClick={() => setAddOpen(true)}><Plus/>Add games</button>}
    />
    <div className="my-games-toolbar">
      <label><Search/><input value={savedQuery} onChange={(event) => setSavedQuery(event.target.value)} placeholder="Search your saved games" aria-label="Search saved games" /></label>
      <span><i/>{data.gameAccounts.length} active · {openAccountRequests.length} creating</span>
    </div>

    {accountCount ? <section className="saved-game-accounts" aria-label="Saved game accounts">
      <div className="connected-account-grid">
        {visiblePendingRequests.map((request) => {
          const game = data.games.find((item) => item.id === request.gameId);
          return <PendingGameAccountCard key={request.id} request={request} game={game} />;
        })}
        {visibleAccounts.map((account) => <GameAccountCard key={account.id} account={account} action={action} loading={loading} go={go} favorite={data.engagement.favoriteGameIds.includes(account.gameId)} />)}
        {visiblePendingRequests.length + visibleAccounts.length === 0 && <div className="empty-line">No saved games match “{savedQuery}”.</div>}
      </div>
    </section> : <Card className="connected-accounts-section"><EmptyGames go={() => setAddOpen(true)} /></Card>}

    {rejectedAccountRequests.length > 0 && <Card className="rejected-game-requests"><SectionTitle title="Needs attention" link={`${rejectedAccountRequests.length} request${rejectedAccountRequests.length === 1 ? "" : "s"}`} /><div className="request-list">{rejectedAccountRequests.slice(0, 4).map((request) => <div key={request.id}><GameAvatar id={request.gameId} name={request.gameName}/><div><strong>{request.gameName}</strong><span>{request.staffNote || "Please contact support before trying again."}</span></div><Status value="rejected" label="needs attention"/></div>)}</div></Card>}

    {addOpen && <div className="account-modal-layer add-game-layer" role="dialog" aria-modal="true" aria-label="Add a game">
      <button className="account-modal-scrim" onClick={() => setAddOpen(false)} aria-label="Close add game dialog"/>
      <div className="add-game-modal">
        <header><div><span>CASINO LIBRARY</span><h2>Add a game</h2><p>Select one casino to begin secure account creation. Your login details appear only after the account is ready.</p></div><button onClick={() => setAddOpen(false)} aria-label="Close"><X/></button></header>
        <label className="add-game-search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search casinos" autoFocus /></label>
        <div className="add-game-list">
          {visibleGames.map((game) => {
            const unavailable = unavailableGameIds.has(game.id);
            return <button key={game.id} className={selected === game.id ? "selected" : ""} disabled={unavailable} onClick={() => setSelected(game.id)}>
              <span className="game-radio">{selected === game.id && <Check/>}</span>
              <GameAvatar id={game.id} name={game.name} color={game.accent}/>
              <span><strong>{game.name}</strong><small>{unavailable ? "Already added or being created" : gamePresentation[game.id]?.category ?? "Casino platform"}</small></span>
              {unavailable ? <Status value="active" label="added"/> : <ChevronRight/>}
            </button>;
          })}
        </div>
        <footer><button className="secondary" onClick={() => setAddOpen(false)}>Done</button><button className="primary" disabled={!selected || loading} onClick={create}>{loading ? <RefreshCw className="spin"/> : <Send/>}Send account request</button></footer>
      </div>
    </div>}
  </div>;
}

function PendingGameAccountCard({ request, game }: { request: GameRequest; game?: Game }) {
  const progress = request.status === "processing" ? "Securing your player login…" : "Your game account is being created…";
  return <article className="connected-game-card pending-game-card" style={{ "--game": game?.accent ?? "#a965d2" } as React.CSSProperties}>
    <span className="account-card-glow" aria-hidden="true"/>
    <header className="connected-game-head"><div className="connected-game-logo"><GameAvatar id={request.gameId} name={request.gameName} color={game?.accent}/></div><div className="connected-game-title"><span className="creating-status"><RefreshCw className="spin"/><i/>CREATING</span><h3>{request.gameName}</h3><strong>$0.00</strong></div></header>
    <div className="account-balance-row"><button disabled><RefreshCw/>Refresh balance</button><span>Current balance · $0.00</span></div>
    <div className="pending-credential-state"><AccountCreationLoader/><strong>{progress}</strong><small>Keep this page open or return later. Your Game ID and password will appear here automatically.</small></div>
    <div className="account-credit-actions"><button disabled><ArrowDownToLine/>Deposit</button><button disabled><ArrowUpFromLine/>Withdraw credits</button></div>
    <button className="account-play" disabled><Play/>Play now</button>
  </article>;
}

function AccountCreationLoader() {
  return <div className="pl" aria-label="Creating account"><div>{Array.from({ length: 12 }, (_, index) => <span className="pl__dot" key={index}/>)}</div><span className="pl__text">Creating</span></div>;
}

function GameAccountCard({ account, action, loading, go, favorite }: { account: GameAccount; action: (p: Record<string, unknown>) => Promise<unknown>; loading: boolean; go: (target: View, gameId?: string) => void; favorite: boolean }) {
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [balance, setBalance] = useState(Number(account.balance ?? 0));
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState(account.balanceUpdatedAt);
  const [copied, setCopied] = useState<"id" | "password" | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(5);

  async function reveal() { if (password) { setPasswordVisible((visible) => !visible); return; } const result = await action({ action: "reveal_game_password", accountId: account.id }) as { password?: string }; if (result.password) { setPassword(result.password); setPasswordVisible(true); } }
  async function copyValue(value: string, type: "id" | "password") { await navigator.clipboard.writeText(value); setCopied(type); window.setTimeout(() => setCopied(null), 1500); }
  async function refreshBalance() { const result = await action({ action: "refresh_game_balance", accountId: account.id }) as { balance?: number; balanceUpdatedAt?: string }; if (typeof result.balance === "number") setBalance(result.balance); if (result.balanceUpdatedAt) setBalanceUpdatedAt(result.balanceUpdatedAt); }
  async function resetPassword() { const result = await action({ action: "request_password_reset", accountId: account.id }) as { requestId?: string }; if (result.requestId) { setResetOpen(false); go("support"); } }
  async function withdrawCredits() { const result = await action({ action: "request_game_credit_withdrawal", accountId: account.id, amount: withdrawAmount }) as { requestId?: string }; if (result.requestId) setWithdrawOpen(false); }
  function play() {
    if (!account.launchUrl) return;
    void fetch("/api/platform", { method: "POST", credentials: "include", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "record_game_launch", accountId: account.id }) });
    window.open(account.launchUrl, "_blank", "noopener,noreferrer");
  }

  return <article className="connected-game-card" style={{ "--game": account.accent } as React.CSSProperties}>
    <span className="account-card-glow" aria-hidden="true" />
    <header className="connected-game-head"><div className="connected-game-logo"><GameAvatar id={account.gameId} name={account.gameName} color={account.accent} /></div><div className="connected-game-title"><span><i />{account.status.toUpperCase()}</span><h3>{account.gameName}</h3><strong>{money(balance)}</strong></div><button className={`account-favorite ${favorite ? "active" : ""}`} onClick={() => action({ action: "toggle_game_favorite", gameId: account.gameId })} aria-label={`${favorite ? "Remove from" : "Add to"} favorites`}><Star fill={favorite ? "currentColor" : "none"} /></button></header>
    <div className="account-balance-row"><button onClick={refreshBalance} disabled={loading}><RefreshCw className={loading ? "spin" : ""}/>Refresh balance</button><span>Verified balance · {niceDate(balanceUpdatedAt)}</span></div>
    <div className="account-ready-note"><Check/>Your player account is ready. Copy the Game ID and reveal its password below.</div>
    <div className="account-credentials"><div><span><Gamepad2/>Game ID</span><code>{account.username}</code><button onClick={() => copyValue(account.username, "id")} aria-label="Copy game ID" title="Copy Game ID">{copied === "id" ? <Check/> : <Copy/>}</button></div><div><span><KeyRound/>Password</span><code>{passwordVisible && password ? password : "••••••••"}</code><button onClick={reveal} aria-label={passwordVisible ? "Hide password" : "Reveal password"} title={passwordVisible ? "Hide password" : "Reveal password"}>{passwordVisible ? <EyeOff/> : <Eye/>}</button><button onClick={() => password && copyValue(password, "password")} disabled={!password} aria-label="Copy password" title={password ? "Copy password" : "Reveal password first"}>{copied === "password" ? <Check/> : <Copy/>}</button></div><button className="account-reset" onClick={() => setResetOpen(true)}><RefreshCw/>Reset password</button></div>
    <div className="account-credit-actions"><button className="account-add" onClick={() => go("deposit", account.gameId)}><ArrowDownToLine/>Deposit</button><button className="account-withdraw" onClick={() => setWithdrawOpen(true)}><ArrowUpFromLine/>Withdraw credits</button></div>
    <button className="account-play" onClick={play} disabled={!account.launchUrl} title={account.launchUrl ? `Open ${account.gameName}` : "This game's player link will be added to the platform catalog soon"}><Play fill="currentColor"/>{account.launchUrl ? "Play now" : "Link coming soon"}{account.launchUrl && <ExternalLink/>}</button>
    {resetOpen && <div className="account-modal-layer" role="dialog" aria-modal="true" aria-label={`Reset ${account.gameName} password`}><button className="account-modal-scrim" onClick={() => setResetOpen(false)} aria-label="Close reset dialog"/><div className="account-modal"><button className="account-modal-close" onClick={() => setResetOpen(false)} aria-label="Close"><X/></button><span>SECURE RESET</span><div className="account-modal-icon"><KeyRound/></div><h3>Reset your game password</h3><p>Send a secure reset request and DreamFyre will notify you when the new password is ready.</p><div className="account-modal-note"><strong>{account.gameName}</strong><small>The updated password will appear automatically on this card when complete.</small></div><div className="account-modal-actions"><button className="secondary" onClick={() => setResetOpen(false)}>Cancel</button><button className="primary" disabled={loading} onClick={resetPassword}><RefreshCw/>Reset password</button></div></div></div>}
    {withdrawOpen && <div className="account-modal-layer" role="dialog" aria-modal="true" aria-label={`Withdraw ${account.gameName} credits`}><button className="account-modal-scrim" onClick={() => setWithdrawOpen(false)} aria-label="Close withdrawal dialog"/><div className="account-modal compact-modal"><button className="account-modal-close" onClick={() => setWithdrawOpen(false)} aria-label="Close"><X/></button><span>SECURE REDEMPTION</span><div className="account-modal-icon withdraw"><ArrowUpFromLine/></div><h3>Withdraw game credits</h3><p>Once your redemption is confirmed, the amount moves to your DreamFyre cash balance.</p><Field label={`Amount · available ${money(balance)}`}><div className="amount-input"><span>$</span><input type="number" min="5" max={balance} value={withdrawAmount} onChange={(event) => setWithdrawAmount(Number(event.target.value))}/></div></Field><div className="account-modal-actions"><button className="secondary" onClick={() => setWithdrawOpen(false)}>Cancel</button><button className="primary" disabled={loading || withdrawAmount < 5 || withdrawAmount > balance} onClick={withdrawCredits}>Send request</button></div></div></div>}
  </article>;
}

function Deposit({ data, action, loading, initialGameId = "" }: { data: Snapshot; action: (p: Record<string, unknown>) => Promise<unknown>; loading: boolean; initialGameId?: string }) {
  const methods = data.paymentMethods;
  const [amount, setAmount] = useState(25); const [method, setMethod] = useState(methods[0]?.name ?? ""); const [gameId, setGameId] = useState(initialGameId || data.games[0]?.id || ""); const [gameUsername,setGameUsername]=useState(""); const [proof, setProof] = useState<File | null>(null); const [stage, setStage] = useState<"form" | "submitted">("form"); const [copiedDestination,setCopiedDestination]=useState(false);
  const selectedMethod = methods.find((item) => item.name === method) ?? methods[0];
  const paymentReady = Boolean(selectedMethod?.paymentUrl || selectedMethod?.destination);
  async function copyDestination() { if (!selectedMethod?.destination) return; await navigator.clipboard.writeText(selectedMethod.destination); setCopiedDestination(true); window.setTimeout(()=>setCopiedDestination(false),1500); }
  async function submit(e: FormEvent) { e.preventDefault(); let proofKey = ""; if (proof) { const fd = new FormData(); fd.append("proof", proof); const upload = await fetch("/api/payment-proof", { method: "POST", credentials: "include", body: fd }); if (!upload.ok) throw new Error("Payment proof upload failed"); proofKey = (await upload.json()).key; } const result=await action({ action: "create_deposit", amount, method, gameId, gameUsername, proofKey }) as {requestId?:string}; if(result.requestId)setStage("submitted"); }
  return <div className="stack"><PageHead title="Deposit game credits" text="Choose a casino and payment method, then track the verification from your portal." />
    <div className="two-col wide-left deposit-layout"><Card>{stage === "form" ? <form onSubmit={submit} className="form-stack"><div className="step-row"><span className="on">1</span><i /><span className="on">2</span><i /><span>3</span></div><Field label="Select game"><select value={gameId} onChange={(e) => setGameId(e.target.value)}>{data.games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field><Field label="Game username (optional)"><input value={gameUsername} onChange={e=>setGameUsername(e.target.value)} placeholder="Leave blank to use your connected account"/></Field><Field label="Amount"><div className="amount-input"><span>$</span><input type="number" min="5" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div><div className="quick-amounts">{[10,25,50,100].map((n) => <button type="button" key={n} onClick={() => setAmount(n)}>${n}</button>)}</div></Field><Field label="Payment method"><div className="payment-methods payment-methods-full">{methods.map((item) => { const ready=Boolean(item.paymentUrl||item.destination); return <button type="button" key={item.id} className={method === item.name ? "selected" : ""} onClick={() => {setMethod(item.name);setCopiedDestination(false)}}><PaymentMethodIcon method={item}/><span><strong>{item.name}</strong><small>{ready ? "Payment details ready" : "Awaiting super admin"}</small></span>{method === item.name && <Check/>}</button>})}</div>{!methods.length && <div className="empty-line">Payment methods are temporarily unavailable. Please contact support.</div>}</Field>{selectedMethod && <div className={`selected-payment-detail ${paymentReady ? "ready" : "waiting"}`}><PaymentMethodIcon method={selectedMethod}/><div><span>PAY WITH {selectedMethod.name.toUpperCase()}</span><strong>{selectedMethod.network ?? "Secure payment request"}</strong><p>{selectedMethod.instructions || "Complete the payment using the approved details below, then upload the confirmation screenshot."}</p>{selectedMethod.qrImageUrl&&<div className="payment-qr"><Image src={selectedMethod.qrImageUrl} alt={`${selectedMethod.name} payment QR code`} width={251} height={344} unoptimized/><small>Scan the approved Chime QR code</small></div>}{selectedMethod.destination&&<div className="payment-destination"><span>PAYMENT DESTINATION</span><code>{selectedMethod.destination}</code><button type="button" onClick={copyDestination}>{copiedDestination?<Check/>:<Copy/>}{copiedDestination?"Copied":"Copy"}</button></div>}{selectedMethod.paymentUrl ? <a className="payment-link-button" href={selectedMethod.paymentUrl} target="_blank" rel="noopener noreferrer">Open {selectedMethod.name} payment link <ExternalLink/></a> : !selectedMethod.destination&&<div className="payment-link-waiting"><Clock3/>The super administrator has not added payment details yet.</div>}</div></div>}<Field label="Payment screenshot"><label className={`upload ${paymentReady ? "" : "disabled"}`}><Upload/><strong>{proof ? proof.name : "Upload payment proof"}</strong><span>Complete payment using the details above • PNG, JPG or WebP • maximum 4MB</span><input type="file" disabled={!paymentReady} accept="image/png,image/jpeg,image/webp" onChange={(e) => setProof(e.target.files?.[0] ?? null)} /></label></Field><button className="primary full deposit-submit" disabled={loading || !proof || !paymentReady}>{loading ? <RefreshCw className="spin"/> : <ShieldCheck/>}Submit deposit request</button></form> : <div className="submitted"><div className="success-icon"><Check /></div><h3>Deposit request submitted</h3><p>Your screenshot is waiting for staff confirmation. Credits are added only after the payment is verified.</p><div className="timeline"><div className="done"><Check />Proof uploaded</div><div className="active"><ShieldCheck />Staff payment confirmation</div><div><Clock3 />Game credit pending</div></div><button className="secondary" onClick={() => setStage("form")}>New request</button></div>}</Card>
      <Card><h3 className="form-title">Protected request flow</h3><div className="policy"><ShieldCheck /><div><strong>Payment confirmation</strong><p>Every proof is matched to a single transaction request before credits are released.</p></div></div><div className="policy"><Users /><div><strong>Provider fulfilment</strong><p>The authorized operations team processes the selected casino account.</p></div></div><div className="policy"><Zap /><div><strong>Live status tracking</strong><p>Payment review, processing, completion, and failures stay visible in your history.</p></div></div><div className="provider-note"><span>Available methods</span><strong>{methods.length}</strong></div></Card></div>
    <Card><SectionTitle title="Credit request history" link={`${data.gameRequests.filter(r=>r.requestType==="credit").length} requests`}/>{data.gameRequests.some(r=>r.requestType==="credit")?<div className="request-list">{data.gameRequests.filter(r=>r.requestType==="credit").map(r=><div key={r.id}><GameAvatar name={r.gameName}/><div><strong>{money(r.amount)} · {r.gameName}</strong><span>{r.gameUsername||"Username pending"}{r.providerReference?` · Ref ${r.providerReference}`:""}</span></div><Status value={r.status}/></div>)}</div>:<div className="empty-line">No game credit requests yet.</div>}</Card></div>;
}

function PaymentMethodIcon({ method }: { method: { name: string; methodType: string } }) {
  if (method.methodType === "crypto" || /BTC|USDT/i.test(method.name)) return <Bitcoin/>;
  if (method.methodType === "card" || method.methodType === "gateway" || method.name === "Stripe") return <CreditCard/>;
  if (method.name === "Chime") return <Landmark/>;
  return <Smartphone/>;
}

function Wallet({ data, go }: { data: Snapshot; go: (v: View) => void }) { return <div className="stack"><PageHead title="Your wallet" text="Every movement is recorded in an immutable transaction history." />
  <div className="metric-grid"><Metric label="Cash balance" value={money(data.wallet.cashBalance)} icon={CircleDollarSign} accent="teal" /><Metric label="FreePlay credits" value={money(data.wallet.freeplayBalance)} icon={Sparkles} accent="violet" /><Metric label="Referral earnings" value={money(data.wallet.referralBalance)} icon={Gift} accent="amber" /><Metric label="Reserved" value={money(data.wallet.reservedBalance)} icon={LockKeyhole} accent="blue" /></div>
  <div className="action-strip" data-reveal><button onClick={() => go("deposit")}><ArrowDownToLine />Deposit</button><button onClick={() => go("withdraw")}><ArrowUpFromLine />Withdraw</button><button onClick={() => go("transfer")}><Send />Send</button><button onClick={() => go("profile")}><ArrowRight />Receive</button></div><div className="two-col wide-left"><Card><SectionTitle title="Recent transactions" link={`${data.transactions.length} records`} /><TransactionTable rows={data.transactions} /></Card><Card><SectionTitle title="Cashout rules" link="Protected"/><div className="rule-list"><div><span>01</span><p><strong>$10 minimum</strong><small>Cash balance can be withdrawn to a bank account or approved virtual wallet.</small></p></div><div><span>02</span><p><strong>Balance is reserved</strong><small>Requested funds cannot be spent again while staff verifies the payout.</small></p></div><div><span>03</span><p><strong>Game credits stay separate</strong><small>Provider credits are processed through the selected game account workflow.</small></p></div></div></Card></div></div>; }

function Withdraw({ data, action, loading }: { data: Snapshot; action: (p: Record<string, unknown>) => Promise<unknown>; loading: boolean }) { const payoutMethods = [{id:"bank",name:"Bank Account",methodType:"bank"},...data.paymentMethods.filter((item)=>["wallet","crypto"].includes(item.methodType))]; const [method,setMethod]=useState("Bank Account"); const [amount,setAmount]=useState(50); const [destination,setDestination]=useState(""); async function submit(e:FormEvent){e.preventDefault();const result=await action({action:"create_withdrawal",method,amount,destination}) as {message?:string};if(result.message)setDestination("");}
  return <div className="stack"><PageHead title="Withdraw funds" text="Withdraw verified cash balance to a bank account, supported wallet, BTC, or USDT TRC20 address." /><div className="two-col wide-left"><Card><form className="form-stack" onSubmit={submit}><Field label="Withdrawal method"><div className="payment-methods payment-methods-full payout-methods">{payoutMethods.map((item)=><button type="button" className={method===item.name?"selected":""} key={item.id} onClick={()=>setMethod(item.name)}>{item.methodType==="bank"?<Landmark/>:<PaymentMethodIcon method={item}/>}<span><strong>{item.name}</strong><small>{"network" in item && item.network ? item.network : item.methodType==="bank"?"Verified bank payout":"Approved payout method"}</small></span>{method===item.name&&<Check/>}</button>)}</div></Field><Field label="Amount"><div className="amount-input"><span>$</span><input type="number" min="10" max={data.wallet.cashBalance} value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div><small className="helper">Available: {money(data.wallet.cashBalance)}</small></Field><Field label={method === "Bank Account" ? "Account / IBAN" : /BTC|USDT/.test(method) ? "Verified wallet address" : `${method} account ID`}><input required value={destination} onChange={(e)=>setDestination(e.target.value)} placeholder="Enter verified payout destination" /></Field><button className="primary full" disabled={loading||!destination||amount<10||amount>data.wallet.cashBalance}>Submit withdrawal request</button></form></Card><Card><h3 className="form-title">Processing status</h3><div className="timeline vertical"><div className="done"><Check/>Request submitted</div><div className="active"><ShieldCheck/>Balance, identity & fraud review</div><div><Send/>Payout provider</div><div><Check/>Completed</div></div><p className="muted-note">Identity verification is required. Funds are reserved while the request is processing, preventing duplicate spending.</p></Card></div><Card><SectionTitle title="Withdrawal history" link={`${data.withdrawals.length} requests`}/>{data.withdrawals.length?<div className="simple-list">{data.withdrawals.map(w=><div key={w.id}><ArrowUpFromLine/><div><strong>{money(w.amount)} · {w.method}</strong><span>{niceDate(w.createdAt)}</span></div><Status value={w.status}/></div>)}</div>:<div className="empty-line">No withdrawal requests yet.</div>}</Card></div>; }

function Transfer({ data, action, loading }: { data: Snapshot; action: (p: Record<string, unknown>) => Promise<unknown>; loading: boolean }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "checking" | "verified" | "missing">("idle");
  const [verifiedPlayer, setVerifiedPlayer] = useState<{ displayName: string; playerTag: string } | null>(null);

  useEffect(() => {
    const playerTag = recipient.trim();
    if (!playerTag) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/platform", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "lookup_player", playerTag }),
          signal: controller.signal,
        });
        const result = await response.json() as { player?: { displayName: string; playerTag: string } };
        if (response.ok && result.player?.playerTag === playerTag) {
          setVerifiedPlayer(result.player);
          setLookupState("verified");
        } else {
          setVerifiedPlayer(null);
          setLookupState("missing");
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setVerifiedPlayer(null);
          setLookupState("missing");
        }
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [recipient]);

  function updateRecipient(value: string) {
    setRecipient(value);
    setVerifiedPlayer(null);
    setLookupState(value.trim() ? "checking" : "idle");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!verifiedPlayer) return;
    const result = await action({ action: "create_transfer", recipient: verifiedPlayer.playerTag, amount, note }) as { message?: string };
    if (result.message) {
      setRecipient("");
      setVerifiedPlayer(null);
      setLookupState("idle");
      setNote("");
    }
  }

  const initials = verifiedPlayer?.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "DF";
  const amountValid = Number.isFinite(amount) && amount >= 1 && amount <= data.wallet.cashBalance;

  return <div className="stack"><PageHead title="Transfer to a player" text="Instant internal transfers with recipient verification and ledger protection."/><div className="two-col wide-left"><Card><form className="form-stack" onSubmit={submit}><Field label="Recipient player ID"><div className="input-icon"><Search size={17}/><input required value={recipient} onChange={(event) => updateRecipient(event.target.value)} placeholder="DFPlayer_ABC123" autoComplete="off" spellCheck={false}/></div></Field>{lookupState !== "idle" && <div className={`recipient-preview ${lookupState}`} aria-live="polite"><div className="avatar">{lookupState === "checking" ? <RefreshCw className="spin"/> : initials}</div><div><strong>{lookupState === "verified" ? verifiedPlayer?.displayName : recipient}</strong><span>{lookupState === "checking" ? "Checking this player ID…" : lookupState === "verified" ? verifiedPlayer?.playerTag : "No active player matches this exact ID"}</span></div><Status value={lookupState === "verified" ? "active" : lookupState === "checking" ? "pending_review" : "rejected"} label={lookupState === "verified" ? "verified" : lookupState === "checking" ? "checking" : "not found"}/></div>}<Field label="Amount"><div className="amount-input"><span>$</span><input type="number" min="1" max={data.wallet.cashBalance} value={amount} onChange={(event) => setAmount(Number(event.target.value))}/></div></Field><Field label="Note (optional)"><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={80} placeholder="What is this transfer for?"/></Field><button className="primary full" disabled={loading || lookupState !== "verified" || !amountValid}><Send size={17}/>Confirm transfer</button></form></Card><Card><h3 className="form-title">Transfer protection</h3><ul className="check-list large"><li><ShieldCheck/>Recipient ID verified server-side</li><li><LockKeyhole/>Atomic debit and credit</li><li><Clock3/>Available balance checked before sending</li><li><RefreshCw/>Both wallet records update together</li></ul><div className="provider-note"><span>Available to transfer</span><strong>{money(data.wallet.cashBalance)}</strong></div></Card></div></div>;
}

function Explore({ data, action, loading, go }: { data: Snapshot; action: (p: Record<string, unknown>) => Promise<unknown>; loading: boolean; go: (v: View) => void }) {
  const [exchangeAmount, setExchangeAmount] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const claimed = (key: string, period: string) => data.engagement.actions.some((entry) => entry.actionKey === `${key}:${period}`);
  const completedToday = data.transactions.some((tx) => tx.type === "deposit" && tx.status === "completed" && tx.createdAt >= `${isoDay()}T00:00:00.000Z`);
  const transferredThisWeek = data.transactions.some((tx) => tx.type === "transfer" && tx.status === "completed" && tx.createdAt >= `${isoWeek()}T00:00:00.000Z`);
  const referredThisWeek = data.referrals.some((referral) => ["qualified", "completed"].includes(referral.status) && referral.createdAt >= `${isoWeek()}T00:00:00.000Z`);
  const monthlyDeposit = data.transactions.filter((tx) => tx.type === "deposit" && tx.status === "completed" && tx.createdAt.startsWith(isoMonth())).reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);
  const tasks = [
    { key: "daily-login", label: "Daily check-in", detail: "Open the player portal today", amount: 0.25, period: isoDay(), eligible: true, icon: Star },
    { key: "daily-credit", label: "Verified credit load", detail: "Complete one approved game-credit payment today", amount: 4, period: isoDay(), eligible: completedToday, icon: Coins },
    { key: "weekly-transfer", label: "Player transfer", detail: "Send one successful internal transfer this week", amount: 8, period: isoWeek(), eligible: transferredThisWeek, icon: Send },
    { key: "weekly-referral", label: "Qualified referral", detail: "Bring one qualified player this week", amount: 12, period: isoWeek(), eligible: referredThisWeek, icon: Users },
    { key: "vip-monthly", label: "VIP monthly milestone", detail: "$50 in completed credit loads this month", amount: 20, period: isoMonth(), eligible: monthlyDeposit >= 50, icon: Crown },
  ];
  const spinClaimed = claimed("daily-spin", isoDay());
  const tier = data.engagement.lifetimeVolume >= 1500 ? { name: "Platinum", min: 1500, next: 1500 } : data.engagement.lifetimeVolume >= 500 ? { name: "Gold", min: 500, next: 1500 } : data.engagement.lifetimeVolume >= 100 ? { name: "Silver", min: 100, next: 500 } : { name: "Bronze", min: 0, next: 100 };
  const tierProgress = tier.next === tier.min ? 100 : Math.min(100, Math.max(4, ((data.engagement.lifetimeVolume - tier.min) / (tier.next - tier.min)) * 100));
  const favoriteGames = data.games.filter((game) => data.engagement.favoriteGameIds.includes(game.id));
  async function spin() { setSpinning(true); setSpinResult(null); const result = await action({ action: "spin_daily_roulette" }) as { reward?: number; rewardIndex?: number }; if (typeof result.rewardIndex !== "number") { setSpinning(false); return; } const segment = 360 / 8; const target = wheelRotation + 1440 + (360 - (result.rewardIndex * segment + segment / 2)); setWheelRotation(target); if (wheelRef.current) animate(wheelRef.current, { rotate: [wheelRotation, target], duration: 2600, ease: "out(5)" }); await new Promise((resolve) => window.setTimeout(resolve, 2650)); setSpinResult(Number(result.reward ?? 0)); setSpinning(false); }
  async function exchange() { await action({ action: "exchange_freeplay", amount: exchangeAmount }); }

  return <div className="stack"><div className="explore-sticky-head">
    <PageHead title="Rewards lounge" text="Daily rewards, weekly missions, VIP levels and FreePlay exchange—all in one place." action={<button className="secondary" onClick={() => go("referrals")}><Gift />Invite players</button>}/>
    <section className="explore-hero" data-reveal><div><span><Sparkles/>ACTIVE REWARD SEASON</span><h3>PLAY SMART.<br/><em>EARN MORE.</em></h3><p>Complete verified portal activity to unlock FreePlay credits. Every reward is issued through the secure ledger.</p></div><div className="reward-balance"><small>FREEPLAY BALANCE</small><strong>{Math.floor(data.wallet.freeplayBalance)} <b>FP</b></strong><button onClick={() => document.getElementById("marketplace")?.scrollIntoView({ behavior: "smooth" })}>OPEN MARKETPLACE <ChevronRight/></button></div></section>
  </div>
    <div className="explore-grid"><Card className="task-card"><SectionTitle title="Daily & weekly missions" link={`${tasks.filter((task) => claimed(task.key, task.period)).length}/${tasks.length} claimed`}/><div className="task-list">{tasks.map((task) => { const done = claimed(task.key, task.period); const Icon = task.icon; return <div className="task-row" key={task.key}><span className={done ? "done" : ""}><Icon/></span><div><strong>{task.label}</strong><small>{task.detail}</small></div><b>+{task.amount} FP</b><button className={done ? "claimed" : ""} disabled={done || !task.eligible || loading} onClick={() => action({ action: "claim_engagement_reward", rewardKey: task.key })}>{done ? <><Check/>Claimed</> : task.eligible ? "Claim" : "Locked"}</button></div>; })}</div></Card>
      <Card className="roulette-card roulette-card-v2"><div className="roulette-head"><span><Ticket/>DAILY FYRE WHEEL</span><small>One verified spin every day</small></div><div className="roulette-stage"><div className="roulette-pointer"><i/></div><div className="roulette-rim"><div className="roulette-wheel-v2" ref={wheelRef}>{[0.25,0.5,1,2,3,5,0.5,1].map((reward,index)=><span key={`${reward}-${index}`} style={{ transform: `rotate(${index*45 + 22.5}deg) translateY(-42%)` }}><b>{reward}</b><small>FP</small></span>)}<div><Sparkles/><strong>FYRE</strong></div></div></div></div><div className="roulette-copy"><h3>{spinResult != null ? `You won ${spinResult} FP` : spinClaimed ? "Come back tomorrow" : "Your wheel is ready"}</h3><p>{spinResult != null ? "Your FreePlay balance has been updated." : "Every segment awards between 0.25 and 5 FreePlay credits."}</p></div><button className="primary full roulette-spin" disabled={spinClaimed || spinning || loading} onClick={spin}><RotateCw className={spinning ? "spin" : ""}/>{spinning ? "Spinning the wheel…" : spinClaimed ? "Today's spin used" : "Spin for FreePlay"}</button></Card>
      <Card className="tier-card"><div className="tier-medal"><Crown/></div><span>PLAYER TIER</span><h3>{tier.name}</h3><strong>{money(data.engagement.lifetimeVolume)} verified volume</strong><div className="tier-progress"><i style={{ width: `${tierProgress}%` }}/></div><small>{tier.next === tier.min ? "Highest tier unlocked" : `${money(tier.next - data.engagement.lifetimeVolume)} to the next tier`}</small><ul><li><Award/>Priority reward access</li><li><ShieldCheck/>Verified activity tracking</li><li><Sparkles/>Monthly bonus eligibility</li></ul></Card>
      <Card className="marketplace-card" id="marketplace"><div className="marketplace-head"><span><ShoppingBag/>REWARDS MARKETPLACE</span><small>10 FP = $1 cash balance</small></div><h3>Convert FreePlay</h3><p>Move eligible FreePlay credits into your portal cash balance through a recorded exchange.</p><div className="exchange-preview"><div><small>YOU SPEND</small><strong>{exchangeAmount} FP</strong></div><ArrowRight/><div><small>YOU RECEIVE</small><strong>{money(exchangeAmount/10)}</strong></div></div><div className="quick-amounts">{[10,25,50].map((amount)=><button key={amount} onClick={()=>setExchangeAmount(amount)}>{amount} FP</button>)}</div><button className="primary full" disabled={loading || exchangeAmount < 10 || exchangeAmount > data.wallet.freeplayBalance} onClick={exchange}><ShoppingBag/>Exchange credits</button></Card>
    </div>
    <Card><SectionTitle title="Your favourite casinos" link={`${favoriteGames.length} saved`} onClick={() => go("games")}/>{favoriteGames.length ? <div className="favorite-strip">{favoriteGames.map((game)=><button key={game.id} onClick={() => go("games")}><GameAvatar id={game.id} name={game.name} color={game.accent}/><span><strong>{game.name}</strong><small>{gamePresentation[game.id]?.category}</small></span><Heart fill="currentColor"/></button>)}</div> : <div className="empty-line">Tap the heart on any casino slide to save it here.</div>}</Card>
  </div>;
}

function Profile({ data, installApp, go }: { data: Snapshot; installApp: () => void; go: (v: View) => void }) {
  return <AccountCenter player={data.user} installApp={installApp} go={go}/>;
}

function Referrals({ data, toast }: { data: Snapshot; toast: (s:string)=>void }) { const path=`/join/${data.user.referralCode}`; async function copy(){await navigator.clipboard.writeText(`${window.location.origin}${path}`);toast("Referral link copied");} return <div className="stack"><PageHead title="Referral programme" text="Invite trusted players and earn after their first verified deposit."/><Card className="referral-hero"><div><span className="pill"><Gift size={14}/>Your referral link</span><h3>Grow your circle. Earn verified rewards.</h3><p>Bonuses are credited only after the qualifying transaction is confirmed.</p><div className="copy-box"><code>{path}</code><button onClick={copy}><Copy size={16}/>Copy</button></div></div><div className="referral-stat"><strong>{money(data.wallet.referralBalance)}</strong><span>Total earned</span></div></Card><div className="metric-grid three"><Metric label="Total referrals" value={String(data.referrals.length)} icon={Users} accent="teal"/><Metric label="Active referrals" value={String(data.referrals.filter(r=>r.status==="qualified").length)} icon={ShieldCheck} accent="violet"/><Metric label="Referral earned" value={money(data.wallet.referralBalance)} icon={Gift} accent="amber"/></div><Card><SectionTitle title="Referral activity" link="Programme rules"/>{data.referrals.length?<div className="simple-list">{data.referrals.map(r=><div key={r.id}><Users/><div><strong>{r.referredEmail}</strong><span>{niceDate(r.createdAt)}</span></div><Status value={r.status}/></div>)}</div>:<div className="empty-line">No referrals yet. Share your link to get started.</div>}</Card></div>; }

function SupportChannelIcon({ id }: { id: string }) { if (id === "facebook") return <Users/>; if (id === "instagram") return <Camera/>; if (id === "gmail") return <Mail/>; return <MessageCircle/>; }
function supportChannelHref(channel: Snapshot["supportChannels"][number]) { return channel.channelType === "email" ? `mailto:${channel.destination}` : channel.destination; }
function Support({ data, action, loading }: { data: Snapshot; action:(p:Record<string,unknown>)=>Promise<unknown>; loading:boolean }) {
  const [message,setMessage]=useState("");
  async function submit(e:FormEvent){e.preventDefault();await action({action:"support_message",message,channel:"live_chat"});setMessage("");}
  return <div className="stack"><PageHead title="Support centre" text="Choose live chat, Gmail, Facebook, Instagram or another contact channel configured by the super administrator."/><div className="two-col wide-left"><Card className="chat-card"><div className="chat-head"><div className="avatar online">DF</div><div><strong>DreamFyre Live Chat</strong><span>Replies stay attached to your player account</span></div><Status value="ready" label="secure"/></div><div className="messages">{data.supportMessages.length?data.supportMessages.map(m=><div className={m.senderRole==="player"?"mine":"theirs"} key={m.id}><span>{m.message}</span><small>{niceDate(m.createdAt)}</small></div>):<div className="support-empty-message"><MessageCircle/><strong>Start live chat</strong><span>Write below and the support team will reply inside your portal.</span></div>}</div><form className="chat-input" onSubmit={submit}><input required value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write a live-chat message…"/><button disabled={loading} aria-label="Send live-chat message"><Send size={17}/></button></form></Card><div className="stack tight"><Card><div className="channel live-chat-channel"><MessageCircle/><div><strong>Live chat</strong><span>Available securely on this page</span></div><i className="channel-online">ONLINE</i></div></Card>{data.supportChannels.map((channel)=><Card key={channel.id}><a className="channel" href={supportChannelHref(channel)} target={channel.channelType==="email"?undefined:"_blank"} rel={channel.channelType==="email"?undefined:"noopener noreferrer"}><SupportChannelIcon id={channel.id}/><div><strong>{channel.label}</strong><span>{channel.channelType==="email"?channel.destination:`Open the official ${channel.label}`}</span></div><ExternalLink/></a></Card>)}{!data.supportChannels.length&&<Card><div className="channel"><Headphones/><div><strong>More contact options</strong><span>Gmail and social pages will appear after the super admin adds their links.</span></div><Clock3/></div></Card>}<Card><div className="channel"><ShieldCheck/><div><strong>Security concern</strong><span>Use live chat for priority escalation</span></div><ChevronRight/></div></Card></div></div></div>;
}

function Field({ label, children }: { label:string; children:React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function resolveGameId(name: string) {
  const normalized = name.toLowerCase().replaceAll(".", "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized === "juwa-20" ? "juwa-2" : normalized;
}
function GameLogo({ game, id, name, color = "#2dd4bf", compact = false }: { game?: Game; id?: string; name?: string; color?: string; compact?: boolean }) {
  const gameId = game?.id ?? id ?? resolveGameId(name ?? "Game");
  const gameName = game?.name ?? name ?? "Game";
  const accent = game?.accent ?? color;
  const presentation = gamePresentation[gameId];
  const initials = gameName.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return <span className={compact ? "game-avatar game-logo-mark" : "game-logo-mark"} style={{ "--game": accent } as React.CSSProperties}>
    <span className="game-logo-fallback">{initials}</span>
    {presentation?.logo && <Image src={presentation.logo} alt={`${gameName} logo`} fill sizes={compact ? "38px" : "158px"} draggable={false} unoptimized />}
    {gameId === "juwa-2" && <b className="version-badge">2.0</b>}
  </span>;
}
function GameAvatar({ id, name, color="#2dd4bf" }: { id?:string;name:string;color?:string }) { return <GameLogo id={id} name={name} color={color} compact />; }
function TransactionTable({ rows }: { rows: Tx[] }) { return <div className="tx-table">{rows.length ? rows.map(tx=><div key={tx.id}><span className={`tx-icon ${tx.amount>=0?"in":"out"}`}>{tx.amount>=0?<ArrowDownToLine/>:<ArrowUpFromLine/>}</span><div><strong>{tx.description}</strong><small>{niceDate(tx.createdAt)}</small></div><b className={tx.amount>=0?"positive":"negative"}>{tx.amount>=0?"+":""}{money(tx.amount)}</b><Status value={tx.status}/></div>):<div className="empty-line">No transactions found.</div>}</div>; }
