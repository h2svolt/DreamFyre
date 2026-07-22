"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, Bitcoin, Check, ChevronDown, ChevronRight, CircleDollarSign,
  Camera, Clock3, CreditCard, Gamepad2, Gift, Headphones, Heart, LockKeyhole, Mail, Menu,
  Megaphone, MessageCircle, Search, ShieldCheck, Sparkles, Star, Trophy, UserRound, WalletCards, X,
} from "lucide-react";
import { GAME_CATALOG, type GameCatalogItem } from "./lib/game-catalog";

const paymentMethods = [
  { name: "PayPal" }, { name: "Chime" }, { name: "Google Pay" }, { name: "Apple Pay" }, { name: "Cash App" }, { name: "USDT (TRC20)" },
  { name: "Venmo", comingSoon: true }, { name: "Stripe", comingSoon: true }, { name: "Card Payment", comingSoon: true },
];
const faqs = [
  ["How do I get a game account?", "Create a DreamFyre player account, choose a casino, and request access. Your Game ID and password appear securely in My Games when the account is ready."],
  ["How are game credits added?", "Choose a game and payment method, upload the requested proof, and follow the status in your dashboard. Credits are released after verification."],
  ["Can I withdraw game credits?", "Yes. Request a game-credit withdrawal from the connected account card. Once verified, the amount moves to your DreamFyre cash balance for payout."],
  ["Can I send funds to another player?", "Yes. Internal transfers use the recipient's exact DreamFyre Player ID and verify the recipient before funds are moved."],
  ["Does DreamFyre operate the casino games?", "DreamFyre is the account, wallet, and service portal. Gameplay is provided by the listed third-party game platforms and opens on their configured player link."],
];

type PublicContent = {
  banners: Array<{ id: string; title: string; message: string; ctaLabel?: string; ctaUrl?: string; imageUrl?: string }>;
  promotions: Array<{ id: string; code?: string; title: string; description: string; rewardType: string; rewardAmount: number; wagerRequirement: number }>;
  pages: Array<{ slug: string; title: string; body: string; updatedAt: string }>;
  supportChannels: Array<{ id: string; label: string; channelType: string; destination: string }>;
};

function usePublicContent() {
  const [content, setContent] = useState<PublicContent>({ banners: [], promotions: [], pages: [], supportChannels: [] });
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/content", { cache: "no-store", signal: controller.signal });
        if (response.ok) setContent(await response.json());
      } catch { /* static public content remains available */ }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);
  return content;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={`public-brand ${compact ? "compact" : ""}`} aria-label="DreamFyre home"><Image src="/dreamfyre-logo-transparent.webp" alt="DreamFyre" fill sizes={compact ? "180px" : "220px"} priority /></Link>;
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  return <header className="public-header"><div className="public-header-inner"><Brand compact/><button className="public-menu" onClick={() => setOpen((value) => !value)} aria-label="Open menu">{open ? <X/> : <Menu/>}</button><nav className={open ? "open" : ""}><Link href="/games">Games</Link><Link href="/promotions">Promotions</Link><Link href="/support">Support</Link><Link href="/legal/responsible-gaming">Responsible gaming</Link></nav><div className="public-auth-actions"><Link href="/auth?mode=login" className="public-signin">Sign in</Link><Link href="/auth?mode=register" className="public-primary">Create account <ArrowRight/></Link></div></div></header>;
}

function PublicFooter() {
  return <footer className="public-footer"><div className="public-footer-top"><div><Brand compact/><p>One secure portal for casino accounts, payments, player support and rewards.</p><span className="age-mark">21+</span></div><div><strong>Explore</strong><Link href="/games">All games</Link><Link href="/promotions">Promotions</Link><Link href="/support">Help centre</Link></div><div><strong>Legal</strong><Link href="/legal/terms">Terms & conditions</Link><Link href="/legal/privacy">Privacy policy</Link><Link href="/legal/responsible-gaming">Responsible gaming</Link><Link href="/legal/cookies">Cookie policy</Link><Link href="/legal/disclaimer">Disclaimer</Link></div><div><strong>Account</strong><Link href="/auth?mode=login">Player sign in</Link><Link href="/auth?mode=register">Create account</Link><Link href="/auth?staff=1">Staff portal</Link></div></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} DreamFyre. All rights reserved.</span><span>Play responsibly. Eligibility and local restrictions apply.</span><a className="h2svolt-credit" href="https://www.h2svolt.com/" target="_blank" rel="noopener noreferrer">Powered by H2SVolt <ArrowRight/></a></div></footer>;
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="public-shell"><div className="public-ambient" aria-hidden="true"/><PublicHeader/><main>{children}</main><PublicFooter/></div>;
}

function GameArtwork({ game, priority = false }: { game: GameCatalogItem; priority?: boolean }) {
  const initials=game.name.split(" ").map((part)=>part[0]).join("").slice(0,2);
  return <div className="public-game-art" style={{ "--game-accent": game.accent } as React.CSSProperties}>{game.image?<Image src={game.image} alt={`${game.name} logo`} fill sizes="(max-width: 640px) 42vw, (max-width: 1100px) 25vw, 220px" priority={priority}/>:<b className="public-game-fallback">{initials}</b>}<span aria-hidden="true"/></div>;
}

function GameCard({ game, priority = false }: { game: GameCatalogItem; priority?: boolean }) {
  return <article className="public-game-card"><GameArtwork game={game} priority={priority}/><div className="public-game-card-copy"><span>{game.category}</span><h3>{game.name}</h3><p>{game.description}</p><div><button aria-label={`Save ${game.name}`}><Heart/></button><Link href={`/auth?mode=register&game=${game.id}`}>Sign up to play <ArrowRight/></Link></div></div></article>;
}

function PaymentBand() {
  return <section className="public-payments" aria-label="Supported payment methods"><div><span><LockKeyhole/>Secure payment requests</span><strong>Choose the method that works for you</strong></div><div className="payment-marquee">{paymentMethods.map((method) => <span key={method.name} className={method.comingSoon?"coming-soon":""}>{method.name.includes("USDT") ? <Bitcoin/> : <CreditCard/>}{method.name}{method.comingSoon&&<small>SOON</small>}</span>)}</div></section>;
}

export function PublicHome() {
  const featured = GAME_CATALOG.slice(0, 8);
  const { banners } = usePublicContent();
  return <PublicShell><section className="public-hero"><div className="public-hero-copy"><span className="public-kicker"><i/>{GAME_CATALOG.length} casino platforms. One player account.</span><h1>Your games.<br/><em>Your wallet.</em><br/>One secure place.</h1><p>Discover casino platforms, request your player accounts, manage credits, track every transaction, and get help from one clean dashboard.</p><div className="public-hero-actions"><Link className="public-primary large" href="/auth?mode=register">Create player account <ArrowRight/></Link><Link className="public-secondary large" href="/games"><Gamepad2/>Explore games</Link></div><div className="public-trust-row"><span><ShieldCheck/>Protected account access</span><span><Clock3/>Request tracking</span><span><Headphones/>Player support</span></div></div><div className="public-hero-showcase"><div className="public-orbit" aria-hidden="true"/><div className="public-feature-card"><div><span>LIVE CASINO DIRECTORY</span><strong>{GAME_CATALOG.length}</strong><small>platforms available</small></div><div className="public-logo-stack">{featured.slice(0, 6).map((game, index) => <span key={game.id} style={{ "--i": index } as React.CSSProperties}>{game.image?<Image src={game.image} alt="" fill sizes="72px"/>:<b>{game.shortName}</b>}</span>)}</div><Link href="/games">Browse every casino <ChevronRight/></Link></div><div className="public-wallet-float"><WalletCards/><span>Wallet & credits</span><strong>One dashboard</strong></div><div className="public-reward-float"><Gift/><span>Rewards</span><strong>Track and claim</strong></div></div></section>{banners[0]&&<section className="public-live-banner" style={banners[0].imageUrl?{backgroundImage:`linear-gradient(90deg,rgba(5,13,22,.96),rgba(5,13,22,.68)),url(${banners[0].imageUrl})`}:undefined}><Megaphone/><div><span>PLAYER UPDATE</span><h2>{banners[0].title}</h2><p>{banners[0].message}</p></div>{banners[0].ctaLabel&&banners[0].ctaUrl&&<Link href={banners[0].ctaUrl}>{banners[0].ctaLabel}<ArrowRight/></Link>}</section>}<PaymentBand/><section className="public-section public-featured"><div className="public-section-head"><div><span className="public-kicker"><i/>Featured platforms</span><h2>Find your next casino</h2><p>Real platform artwork, clear categories, and a simple account request when you are ready.</p></div><Link href="/games">View all {GAME_CATALOG.length} <ArrowRight/></Link></div><div className="public-game-grid">{featured.map((game, index) => <GameCard key={game.id} game={game} priority={index < 4}/>)}</div></section><section className="public-section public-how"><div className="public-section-head centered"><div><span className="public-kicker"><i/>Simple from the first click</span><h2>From signup to play in three steps</h2><p>No confusing provider forms. DreamFyre keeps the request and its status in one place.</p></div></div><div className="public-step-grid"><article><span>01</span><UserRound/><h3>Create your ID</h3><p>Register with email or a configured Google, Apple, or Microsoft identity.</p></article><article><span>02</span><Gamepad2/><h3>Choose a game</h3><p>Request an account and follow the secure creation status in My Games.</p></article><article><span>03</span><Sparkles/><h3>Get ready to play</h3><p>Your Game ID and password appear only when the provider account is ready.</p></article></div></section><section className="public-section public-dashboard-preview"><div><span className="public-kicker"><i/>Built around the player</span><h2>Everything important stays visible</h2><p>Your wallet, active casino accounts, secure credentials, deposits, withdrawals, transfers, rewards, notifications, and support stay together.</p><ul><li><Check/>Game ID and encrypted password controls</li><li><Check/>Real, bonus, referral and reserved balances</li><li><Check/>Payment and withdrawal status tracking</li><li><Check/>Favorites, recent play and searchable games</li></ul><Link href="/auth?mode=register" className="public-primary">Open your dashboard <ArrowRight/></Link></div><div className="public-preview-panel"><div className="preview-top"><span>PLAYER OVERVIEW</span><i/><i/><i/></div><div className="preview-balance"><small>AVAILABLE BALANCE</small><strong>$0.00</strong><span><ShieldCheck/>Protected ledger</span></div><div className="preview-accounts">{GAME_CATALOG.slice(8, 12).map((game) => <div key={game.id}><GameArtwork game={game}/><span><strong>{game.name}</strong><small>Account setup available</small></span><ChevronRight/></div>)}</div></div></section><section className="public-section public-responsible"><div><ShieldCheck/><span><strong>Play responsibly</strong><small>Age confirmation, account limits, self-exclusion tools, security alerts, and support are part of the portal.</small></span></div><Link href="/legal/responsible-gaming">Responsible gaming tools <ArrowRight/></Link></section></PublicShell>;
}

export function PublicGames() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(GAME_CATALOG.map((game) => game.category)))];
  const games = useMemo(() => GAME_CATALOG.filter((game) => (category === "All" || game.category === category) && `${game.name} ${game.description}`.toLowerCase().includes(query.toLowerCase().trim())), [category, query]);
  return <PublicShell><section className="public-page-hero"><span className="public-kicker"><i/>DreamFyre game directory</span><h1>{GAME_CATALOG.length} platforms.<br/><em>Find your game.</em></h1><p>Search every available casino platform. Create a player account when you are ready to request access.</p></section><section className="public-section public-games-page"><div className="public-game-tools"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games"/></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown/></label><strong>{games.length} games</strong></div><div className="public-game-grid all-games">{games.map((game) => <GameCard key={game.id} game={game}/>)}</div>{!games.length && <div className="public-empty"><Search/><h2>No games found</h2><p>Try another name or category.</p></div>}</section><section className="public-cta"><div><span>Ready when you are</span><h2>Create your DreamFyre player ID</h2><p>Save favorites, request casino accounts, and manage everything from your dashboard.</p></div><Link href="/auth?mode=register" className="public-primary large">Create account <ArrowRight/></Link></section></PublicShell>;
}

export function PublicPromotions() {
  const { promotions: livePromotions } = usePublicContent();
  const [query, setQuery] = useState("");
  const promos = [
    { icon: Gift, tag: "REFERRALS", title: "Invite friends. Track rewards.", text: "Use your personal referral link and see every qualified referral and reward in one place." },
    { icon: Trophy, tag: "MISSIONS", title: "Activity that earns", text: "Daily check-ins, verified credit loads, transfers and milestones can unlock FreePlay credits." },
    { icon: Star, tag: "VIP LEVELS", title: "Progress you can see", text: "Track verified activity against visible player tiers and available programme benefits." },
    { icon: Sparkles, tag: "PROMO CODES", title: "Apply eligible offers", text: "Enter active promotion codes and see eligibility, award status and wagering progress." },
  ];
  const normalized = query.trim().toLowerCase();
  const filteredPromos = promos.filter((promo) => `${promo.tag} ${promo.title} ${promo.text}`.toLowerCase().includes(normalized));
  const filteredLive = livePromotions.filter((promo) => `${promo.code ?? ""} ${promo.title} ${promo.description}`.toLowerCase().includes(normalized));
  return <PublicShell><section className="public-page-hero"><span className="public-kicker"><i/>Rewards & promotions</span><h1>More value.<br/><em>No hidden progress.</em></h1><p>Discover active promotions, referral rewards, FreePlay missions and tier benefits from one player dashboard.</p></section><section className="public-section"><label className="public-content-search"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search promotions, codes and rewards"/></label>{filteredLive.length>0&&<div className="public-live-promos">{filteredLive.map((promo)=><article key={promo.id}><span>{promo.code||"ACTIVE OFFER"}</span><h2>{promo.title}</h2><p>{promo.description}</p><strong>{promo.rewardAmount} {promo.rewardType}</strong><Link href="/auth?mode=register">Sign up to claim <ArrowRight/></Link></article>)}</div>}<div className="public-promo-grid">{filteredPromos.map(({ icon: Icon, ...promo }) => <article key={promo.tag}><span>{promo.tag}</span><Icon/><h2>{promo.title}</h2><p>{promo.text}</p><Link href="/auth?mode=register">Create account <ArrowRight/></Link></article>)}</div>{!filteredPromos.length&&!filteredLive.length&&<div className="public-empty"><Search/><h2>No matching promotions</h2><p>Try a broader search.</p></div>}<div className="public-promo-note"><BadgeCheck/><div><strong>Eligibility is always checked</strong><p>Promotions may be enabled, disabled or limited by the operator. Your dashboard shows only rewards that apply to your account.</p></div></div></section></PublicShell>;
}

function PublicSupportIcon({ id }: { id: string }) { if (id === "facebook") return <UserRound/>; if (id === "instagram") return <Camera/>; if (id === "gmail") return <Mail/>; return <Headphones/>; }
function publicSupportHref(channel: PublicContent["supportChannels"][number]) { return channel.channelType === "email" ? `mailto:${channel.destination}` : channel.destination; }

export function PublicSupport() {
  const [openFaq, setOpenFaq] = useState(0);
  const [query, setQuery] = useState("");
  const { supportChannels } = usePublicContent();
  const filteredFaqs = faqs.filter(([question,answer])=>`${question} ${answer}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <PublicShell><section className="public-page-hero"><span className="public-kicker"><i/>Player help centre</span><h1>Answers first.<br/><em>People when needed.</em></h1><p>Search common questions or contact DreamFyre through live chat, Gmail, Facebook, Instagram and other configured channels.</p></section><section className="public-section public-support-grid"><div><span className="public-kicker"><i/>Frequently asked questions</span><h2>Quick answers</h2><label className="public-content-search faq"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search help questions"/></label><div className="public-faq-list">{filteredFaqs.map(([question, answer]) => {const index=faqs.findIndex(([item])=>item===question);return <button key={question} className={openFaq === index ? "open" : ""} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span><strong>{question}</strong><ChevronDown/></span>{openFaq === index && <p>{answer}</p>}</button>})}{!filteredFaqs.length&&<p className="public-faq-empty">No matching answer. Sign in to contact support.</p>}</div></div><aside><h2>Contact support</h2><p>Signed-in players can use live chat and keep the complete conversation attached to their account.</p><Link href="/auth?mode=login"><MessageCircle/>Open secure live chat <ArrowRight/></Link>{supportChannels.map((channel)=><a key={channel.id} href={publicSupportHref(channel)} target={channel.channelType==="email"?undefined:"_blank"} rel={channel.channelType==="email"?undefined:"noopener noreferrer"}><PublicSupportIcon id={channel.id}/>{channel.label}<ArrowRight/></a>)}{!supportChannels.length&&<span><Mail/><div><strong>Gmail & social pages</strong><small>Links are being configured by the operator</small></div></span>}<div className="public-security-callout"><ShieldCheck/><p>Never send your portal password, one-time code, or full payment credentials in chat.</p></div></aside></section></PublicShell>;
}

const legalContent: Record<string, { title: string; intro: string; sections: Array<[string, string]> }> = {
  terms: { title: "Terms & Conditions", intro: "These terms explain the rules for using the DreamFyre account, wallet, payments and support portal.", sections: [["Eligibility", "Users must meet the legal age and location requirements that apply to them. DreamFyre may request age, identity or location verification before enabling restricted services."], ["Platform role", "DreamFyre manages portal accounts, service requests and records. Third-party game providers operate their own games, availability and player systems."], ["Wallet and payments", "Deposits, credits, transfers, rewards and withdrawals remain subject to verification, limits, fraud controls and operator approval."], ["Account security", "You are responsible for protecting your password and devices, reporting unauthorized access, and keeping profile details accurate."], ["Suspension", "Access may be limited or suspended for security, legal, responsible-gaming, fraud or policy reasons."]] },
  privacy: { title: "Privacy Policy", intro: "This policy describes the personal information needed to operate and protect DreamFyre.", sections: [["Information collected", "Account, contact, verification, device, transaction, support and security information may be collected when you use the portal."], ["Why it is used", "Information is used to authenticate users, process requests, meet legal obligations, detect fraud, provide support and improve the service."], ["Sharing", "Relevant data may be shared with approved payment, identity, communications and game-service providers only as needed to deliver the service or comply with law."], ["Retention and rights", "Records are retained for operational, security and legal needs. Applicable access, correction or deletion requests can be sent to support."]] },
  "responsible-gaming": { title: "Responsible Gaming", intro: "DreamFyre provides controls intended to help eligible adults keep play within personal limits.", sections: [["Set limits", "Players can request deposit limits, time-outs and account restrictions from their profile or support."], ["Self-exclusion", "A self-exclusion request blocks portal access for the selected period. It cannot be reversed early without the required review."], ["Know the signs", "Chasing losses, borrowing to play, hiding activity or playing beyond a budget are warning signs. Stop and seek independent help."], ["Age restriction", "Minors may not use the service. Age and identity checks can be required before deposits, withdrawals or gameplay access."]] },
  cookies: { title: "Cookie Policy", intro: "DreamFyre uses a small number of cookies and browser storage features to keep the service secure and usable.", sections: [["Essential cookies", "Secure session cookies keep users signed in and protect access to player or staff areas."], ["Preferences", "Browser storage may remember display or install preferences. These items do not replace secure server-side records."], ["Control", "Blocking essential cookies may prevent login and protected portal functions from working."]] },
  disclaimer: { title: "Disclaimer", intro: "Important limits and responsibilities for using the DreamFyre portal.", sections: [["Third-party platforms", "Game availability, performance, results and provider rules belong to the relevant third-party game operator."], ["No guaranteed outcome", "Promotions, rewards and game outcomes do not guarantee profit or future results."], ["Availability", "Service interruptions may occur during provider, payment, maintenance or network outages."], ["Local law", "Users are responsible for confirming that access and activity are lawful in their location."]] },
};

export function PublicLegal({ slug }: { slug: string }) {
  const page = legalContent[slug] ?? legalContent.disclaimer;
  const { pages } = usePublicContent();
  const managed = pages.find((item)=>item.slug===slug);
  const paragraphs = managed?.body.split(/\n\s*\n/).map((item)=>item.trim()).filter(Boolean)??[];
  return <PublicShell><section className="public-page-hero legal"><span className="public-kicker"><i/>DreamFyre policy centre</span><h1>{managed?.title??page.title}</h1><p>{managed?paragraphs[0]??page.intro:page.intro}</p></section><article className="public-legal-doc"><div className="public-legal-meta"><ShieldCheck/><span><strong>{managed?"Client-published policy":"Plain-language implementation draft"}</strong><small>{managed?`Updated ${new Date(managed.updatedAt).toLocaleDateString()}`:"Requires client and legal approval before launch"}</small></span></div>{managed?paragraphs.slice(1).map((body,index)=><section key={`${index}-${body.slice(0,16)}`}><span>{String(index+1).padStart(2,"0")}</span><div><p>{body}</p></div></section>):page.sections.map(([title, body], index) => <section key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{title}</h2><p>{body}</p></div></section>)}<div className="public-legal-contact"><CircleDollarSign/><div><strong>Questions about this policy?</strong><p>Contact the operator before using a feature you do not understand.</p></div><Link href="/support">Visit support <ArrowRight/></Link></div></article></PublicShell>;
}
