"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  Gift,
  Home,
  Landmark,
  Menu,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import "./wireframes.css";

type Concept = {
  id: string;
  number: string;
  name: string;
  note: string;
  className: string;
};

const concepts: Concept[] = [
  { id: "ledger", number: "01", name: "The Ledger", note: "Calm, trustworthy fintech", className: "ledger" },
  { id: "arcade", number: "02", name: "Modern Arcade", note: "Game-first and energetic", className: "arcade" },
  { id: "club", number: "03", name: "Members Club", note: "Premium and editorial", className: "club" },
  { id: "compact", number: "04", name: "Compact Console", note: "Dense, fast dashboard", className: "compact" },
  { id: "mobile", number: "05", name: "Mobile First", note: "Simple app-like flow", className: "mobile" },
];

const nav = [
  [Home, "Overview"],
  [Gamepad2, "Games"],
  [ArrowDownToLine, "Deposit"],
  [ArrowUpFromLine, "Withdraw"],
  [Send, "Transfer"],
];

function SideNav({ minimal = false }: { minimal?: boolean }) {
  return (
    <aside className="wf-sidebar">
      <div className="wf-logo"><span>DF</span>{!minimal && <b>DreamFyre</b>}</div>
      <nav>{nav.map(([Icon, label], index) => <div className={index === 0 ? "active" : ""} key={label as string}><Icon size={17} />{!minimal && <span>{label as string}</span>}</div>)}</nav>
      <div className="wf-sidefoot"><CircleHelp size={17} />{!minimal && <span>Get help</span>}</div>
    </aside>
  );
}

function Topbar({ title = "Overview" }: { title?: string }) {
  return <header className="wf-top"><div><small>PLAYER ACCOUNT</small><h2>{title}</h2></div><div className="wf-user"><span>JD</span><div><b>Jordan Davis</b><small>Verified player</small></div></div></header>;
}

function Stat({ label, value, action }: { label: string; value: string; action?: string }) {
  return <article className="wf-stat"><span>{label}</span><strong>{value}</strong>{action && <button>{action}<ChevronRight size={14} /></button>}</article>;
}

function GameCards() {
  return <div className="wf-games">
    {["Fortune Reels", "Midnight Poker", "Royal Blackjack"].map((game, i) => <article key={game}><div className={`game-art art-${i + 1}`}><span>{i === 0 ? "FR" : i === 1 ? "MP" : "RB"}</span></div><div><b>{game}</b><small>{i === 1 ? "Table game" : "Instant play"}</small></div><button>Play</button></article>)}
  </div>;
}

function Transactions() {
  return <div className="wf-transactions">
    <div className="wf-section-head"><div><small>ACTIVITY</small><h3>Recent transactions</h3></div><button>View all</button></div>
    {[["Deposit", "Apple Pay", "+$250.00", "complete"], ["Transfer", "To @alexm", "−$40.00", "complete"], ["Withdrawal", "Bank •• 8210", "−$120.00", "pending"]].map(([type, meta, amount, status]) => <div className="wf-row" key={type}><span className="row-icon">{type === "Deposit" ? <Plus size={15} /> : type === "Transfer" ? <Send size={15} /> : <Landmark size={15} />}</span><div><b>{type}</b><small>{meta}</small></div><strong>{amount}</strong><em className={status}>{status}</em></div>)}
  </div>;
}

function Ledger() {
  return <div className="wireframe ledger-frame"><SideNav /><main><Topbar /><section className="wf-body"><div className="ledger-welcome"><div><small>SATURDAY, JULY 18</small><h1>Good evening, Jordan.</h1><p>Your account is verified and ready to play.</p></div><button><Plus size={16} />Add funds</button></div><div className="wf-stat-grid"><Stat label="Available balance" value="$2,480.50" action="View wallet" /><Stat label="Free play" value="$125.00" action="Use rewards" /><Stat label="Pending" value="$0.00" action="See activity" /></div><div className="wf-two"><div><div className="wf-section-head"><div><small>PLAY</small><h3>Recently played</h3></div><button>All games</button></div><GameCards /></div><Transactions /></div></section></main></div>;
}

function Arcade() {
  return <div className="wireframe arcade-frame"><SideNav minimal /><main><div className="arcade-top"><div className="wf-logo"><span>DF</span><b>DreamFyre</b></div><div className="arcade-search">Search games</div><button><WalletCards size={16} />$2,480.50</button><span className="avatar">JD</span></div><section className="wf-body"><div className="arcade-hero"><div><span className="eyebrow"><Sparkles size={14} />FOR YOU</span><h1>Pick up where<br />you left off.</h1><p>Fortune Reels is ready when you are.</p><button>Play now <ChevronRight size={16} /></button></div><div className="arcade-orbit"><b>FR</b><span>96%</span></div></div><div className="arcade-strip"><Stat label="Cash balance" value="$2,480.50" /><Stat label="Free play" value="$125.00" /><button><Plus size={17} />Deposit</button><button className="outline"><Send size={17} />Send</button></div><div className="wf-section-head"><div><small>LIBRARY</small><h3>Popular right now</h3></div><button>Browse all</button></div><GameCards /></section></main></div>;
}

function Club() {
  return <div className="wireframe club-frame"><header className="club-header"><div className="wf-logo"><span>DF</span><b>DREAMFYRE</b></div><nav>PLAY&nbsp;&nbsp;&nbsp;&nbsp; WALLET&nbsp;&nbsp;&nbsp;&nbsp; REWARDS&nbsp;&nbsp;&nbsp;&nbsp; SUPPORT</nav><div><span>$2,480.50</span><b>JD</b></div></header><main><section className="club-intro"><small>MEMBER NO. 004182</small><h1>Your private<br /><i>player’s club.</i></h1><p>A quieter way to play, manage funds, and collect rewards.</p><button>Explore games</button></section><section className="club-panel"><div className="club-balance"><span>AVAILABLE TO PLAY</span><strong>$2,480<small>.50</small></strong><div><button>Add funds</button><button>Withdraw</button></div></div><div className="club-divider" /><div className="club-perks"><Gift size={22} /><span>CURRENT BENEFIT</span><h3>$125 free play</h3><p>Available across eligible games.</p><button>View rewards →</button></div></section><section className="club-bottom"><div className="wf-section-head"><div><small>THE COLLECTION</small><h3>Selected for you</h3></div><button>View all games</button></div><GameCards /></section></main></div>;
}

function Compact() {
  return <div className="wireframe compact-frame"><SideNav /><main><Topbar title="Player console" /><section className="wf-body"><div className="compact-grid"><div className="compact-balance"><span>AVAILABLE BALANCE</span><strong>$2,480.50</strong><div><button><Plus size={15} />Deposit</button><button><ArrowUpFromLine size={15} />Withdraw</button><button><Send size={15} />Transfer</button></div></div><Stat label="Free play" value="$125.00" /><Stat label="Referral earnings" value="$80.00" /><div className="compact-status"><ShieldCheck size={22} /><div><b>Account verified</b><small>All services available</small></div></div></div><div className="compact-columns"><section><div className="wf-section-head"><div><small>QUICK LAUNCH</small><h3>Your games</h3></div><button>Manage</button></div><GameCards /></section><section><Transactions /></section></div></section></main></div>;
}

function Mobile() {
  return <div className="wireframe mobile-frame"><div className="mobile-shell"><header><button><Menu size={19} /></button><div className="wf-logo"><span>DF</span><b>DreamFyre</b></div><span className="avatar">JD</span></header><main><div className="mobile-greeting"><span>Good evening</span><h1>Jordan</h1></div><div className="mobile-card"><span>AVAILABLE BALANCE</span><strong>$2,480.50</strong><small>Updated just now</small></div><div className="mobile-actions">{[[Plus,"Deposit"],[ArrowUpFromLine,"Withdraw"],[Send,"Send"],[Gift,"Rewards"]].map(([Icon,label]) => <button key={label as string}><span><Icon size={18} /></span>{label as string}</button>)}</div><div className="wf-section-head"><div><small>RECENT</small><h3>Continue playing</h3></div><button>See all</button></div><GameCards /><Transactions /></main><nav>{[[Home,"Home"],[Gamepad2,"Games"],[WalletCards,"Wallet"],[UserRound,"Profile"]].map(([Icon,label],i) => <button className={i===0?"active":""} key={label as string}><Icon size={18}/><span>{label as string}</span></button>)}</nav></div><div className="mobile-note"><small>DIRECTION 05</small><h2>Mobile at the center.</h2><p>A familiar app-like experience that keeps the most common actions within thumb reach.</p></div></div>;
}

const renderConcept = (id: string) => id === "ledger" ? <Ledger /> : id === "arcade" ? <Arcade /> : id === "club" ? <Club /> : id === "compact" ? <Compact /> : <Mobile />;

export default function ConceptsPage() {
  const [selected, setSelected] = useState("ledger");
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => { if (stage.current) animate(stage.current, { opacity: [0, 1], translateY: [8, 0], duration: 420, ease: "outQuad" }); }, [selected]);
  useEffect(() => { animate(".concept-tab", { opacity: [0, 1], translateY: [6, 0], delay: stagger(55), duration: 350, ease: "outQuad" }); }, []);
  const active = concepts.find(c => c.id === selected)!;
  return <div className="concepts-page"><header className="concepts-head"><div><small>DREAMFYRE / DESIGN STUDY</small><h1>Choose a direction.</h1><p>Five clean interface concepts for the same player platform.</p></div><Link href="/">Current product <ChevronRight size={15}/></Link></header><div className="concept-tabs">{concepts.map(c => <button key={c.id} className={`concept-tab ${selected === c.id ? "selected" : ""}`} onClick={() => setSelected(c.id)}><span>{c.number}</span><div><b>{c.name}</b><small>{c.note}</small></div></button>)}</div><div className="concept-meta"><span>DIRECTION {active.number}</span><b>{active.name}</b><p>{active.note}</p></div><div ref={stage} key={selected} className={`concept-stage ${active.className}`}>{renderConcept(selected)}</div><footer className="concept-footer">Wireframe comparison • Desktop and mobile responsive • Core functionality represented in every direction</footer></div>;
}
