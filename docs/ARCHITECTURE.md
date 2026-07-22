# DreamFyre architecture

## Runtime

- UI: Next.js App Router, React 19 and TypeScript
- Styling: DreamFyre CSS system, Tailwind CSS utilities, local Manrope/Oxanium fonts
- Motion: Anime.js plus CSS transitions with reduced-motion fallbacks
- API: same-origin Next.js route handlers running as Vercel Node.js functions
- Database: remote Turso/libSQL in hosted environments; local SQLite only in development
- Private files: profile images and payment-proof images stored as database BLOBs and returned through authorized routes

## Route map

| Route | Access | Purpose |
| --- | --- | --- |
| / | Public or signed-in | Public homepage, player dashboard, or staff redirect |
| /games | Public | Searchable/filterable 31-game catalogue |
| /promotions | Public | Active offers and promotion search |
| /support | Public | FAQ search and contact entry points |
| /legal/[slug] | Public | Terms, privacy, responsible gaming, cookies and disclaimer |
| /join/[code] | Public | Referral landing and registration redirect |
| /auth | Public | Player/staff login, registration and account recovery |
| /admin | Staff only | Permission-aware operations console |
| /api/auth | Mixed | Registration, login/logout, recovery, verification and 2FA |
| /api/oauth/[provider] | Public | Google, Apple or Microsoft OAuth start/callback |
| /api/platform | Player only | Game, wallet, payment, transfer, reward and support actions |
| /api/account | Player only | Profile, security, KYC, promotions and responsible gaming |
| /api/admin | Staff only | Queues, staff, payments, content, reporting and audit actions |
| /api/content | Public | Published banners, promotions and CMS pages |
| /api/payment-proof | Owner/staff | Private proof upload and retrieval |
| /api/avatar | Owner/public response | Profile-image update and image response |

## Authentication and authorization

- Passwords use PBKDF2-SHA256 with a unique random salt.
- Session tokens are random; only a SHA-256 digest is stored.
- Cookies are HttpOnly, SameSite=Lax and Secure on HTTPS.
- Player sessions last up to 30 days; staff database sessions expire after 12 hours.
- Staff roles are support, game_ops, finance, admin and super_admin.
- Every protected API action checks the server-side role/permission matrix.
- Staff accounts receive HTTP 403 from player gameplay and wallet routes.
- Password changes, suspensions and device revocation invalidate affected sessions.
- Login attempts, sensitive credential actions and administrator changes are audited.
- Repeated failed logins, duplicate payment proof and configurable large transactions create administrator review alerts.

Email registration supports verification, forgot/reset password and optional email 2FA. Google, Apple and Microsoft sign-in uses OAuth authorization code flow, state, nonce, PKCE and verified ID tokens. Provider buttons require their official client ID and secret.

## Database initialization

app/api/_lib/runtime.ts adapts the libSQL client to a small prepared-statement interface. app/api/_lib/schema.ts creates missing tables and seeds the game catalogue, payment methods and baseline promotion records idempotently on first API use.

app/api/_lib/schema.ts is the deployment authority. db/schema.ts and the drizzle folder are maintained as typed schema/migration references for developers; Vercel startup does not run drizzle-kit migrations.

Primary data domains include:

- users, credentials, sessions, profiles, devices and login events
- wallets, transactions, transfers and withdrawals
- games, central game launch links, requests, accounts and activity
- promotions, claims, referrals, rewards and notifications
- payment methods and private proof records
- KYC/eligibility reviews and fraud alerts
- support conversations and tickets
- banners, legal CMS pages and audit logs

## Game account and Play URL design

Game-account credentials and launch destinations are deliberately separate:

1. A player request creates a pending game_requests row only.
2. Game Operations creates the account outside DreamFyre in the authorized provider panel.
3. Staff completion requires Game ID and a password of at least six characters. No URL field exists in this workflow.
4. The password is encrypted with AES-GCM and a random IV using GAME_CREDENTIAL_ENCRYPTION_KEY.
5. Supplied player URLs are stored in game_launch_links and staff-only agent URLs in game_provider_links; the super admin can replace both.
6. Every active account for that title resolves only the centrally managed player URL. Provider-admin URLs are returned only by the protected staff API.
7. A player launch is logged in game_activity before the browser opens the provider URL.

Pending cards never contain fake credentials. If the title has no configured URL, the account can still be completed and credentials displayed, but Play remains disabled.

## Financial design

Wallet values are separated into cash, FreePlay, referral and reserved balances. Transactions are the player-visible ledger. Player transfers debit and credit both wallets in a database batch. Withdrawal requests reserve money immediately; completion releases the reserve and rejection returns it.

The supplied payment methods use a staff-reviewed proof-and-approval flow. PayPal, Cash App, Google Pay and Apple Pay open centrally managed links. Chime and USDT use approved destinations, with the supplied Chime QR image. Players upload proof and staff verifies it before crediting. No UI action pretends that a screenshot is a verified gateway transaction. Live automated collection or payout must be driven by signed provider webhooks, provider-side lookups and idempotency keys.

## Referrals and promotions

A referral link uses /join/[code]. Registration attaches the referred email to the referrer. The referral qualifies on the invited player’s first staff-completed deposit. The configured referral reward is credited once and recorded in the wallet, ledger and notifications.

Admins can create FreePlay promotions and promo codes. Claims and wagering progress are stored separately. Welcome/cashback programmes remain configurable and inactive until the client approves their rules.

## Content and notifications

The public content API exposes only active banners/promotions and published CMS pages. Draft legal content never replaces the fallback copy. Admin broadcasts create individual player notifications. Production legal text must be approved before publication.

## Serverless and security considerations

- Never use a file: database on Vercel; its filesystem is temporary.
- Keep Turso tokens, OAuth secrets, email keys and encryption keys server-only.
- Do not change GAME_CREDENTIAL_ENCRYPTION_KEY after live game passwords exist without a re-encryption migration.
- Payment proofs are restricted by MIME type and size; review retention and malware controls before launch.
- Static game artwork is served locally from public/assets/game-logos to avoid third-party hotlinks.
- Production still needs rate limiting/WAF policy, monitoring, backups, restore testing and an independent security assessment.

## Source layout

    app/
      admin/                 Staff operations UI
      api/_lib/              Runtime, schema, sessions, permissions, referrals
      api/account/           Player profile/security API
      api/admin/             Staff operations API
      api/auth/              Local authentication API
      api/oauth/             Social authentication routes
      api/platform/          Player operations API
      public-site.tsx        Public site and content pages
      player-platform.tsx    Signed-in player portal
    docs/                    Deployment, operations and handoff documentation
    public/                  Optimized logos, game artwork and PWA assets
