# DreamFyre casino portal

DreamFyre is a Vercel-ready Next.js platform with a public casino catalogue, player portal, role-based staff console and super-administrator controls. The code implements the internal product workflows; official game, payment, email, identity and compliance services still require the client’s approved accounts and credentials.

## What is included

- Public homepage, 31-game catalogue, promotions, searchable support/FAQ and legal pages
- Responsive player and staff interfaces with optimized local game artwork
- Email registration/login, logout, password recovery, email verification, email 2FA and secure sessions
- Google, Apple and Microsoft sign-in routes ready for official OAuth credentials
- Profile photo, full name, username/player ID, email/Gmail, phone and contact editing, device history, password change and security controls
- Age confirmation, manual identity/location review and KYC-gated withdrawals
- Wallet, ledger, deposits, withdrawals, transfers, FreePlay, referrals and promotions
- PayPal, Chime, Google Pay, Apple Pay, Cash App and USDT TRC20 are preconfigured with the supplied links/destinations; Venmo, Stripe and Card remain disabled as Coming Soon
- Game search, category filters, favorites, recent activity and a responsive game carousel
- Manual game-account fulfilment with encrypted Game IDs/passwords and a neutral creation loader
- Central player and provider-admin URLs per game: Play uses the player URL, while agent/admin links remain visible only to authorized staff
- Live player/staff chat, structured tickets and super-admin-managed Gmail, Facebook, Instagram and WhatsApp contact links
- Responsible-gaming deposit limit, self-exclusion and suspension request
- Super-admin staff creation and role-based support, game operations, finance and admin access
- Admin payment configuration, KYC review, content/CMS, banners, promotions, notifications, reports, fraud queue and audit logs
- Turso/libSQL persistence designed for Vercel serverless functions
- Anime.js motion with reduced-motion support, local fonts and PWA assets
- A signed-in Home view limited to the player’s added/pending games; the complete catalogue remains in Games
- Clickable “Powered by H2SVolt” website credit in the public footer

## Game account flow

1. The player requests one of the 31 casino platforms.
2. The player sees “Creating your game account” and no invented credentials.
3. Game Operations creates the real account in the provider’s authorized panel.
4. Staff enters only the provider Game ID, temporary password and reference.
5. The active player card displays the Game ID and protected password controls.
6. Play opens the supplied player/game URL already configured for that title; provider admin URLs never reach the player API.
7. If a game URL has not been supplied yet, Play is safely disabled as “Link coming soon.”

## Payment proof flow

1. The super admin opens Payments and maintains the current payment link, tag or wallet destination for each enabled method.
2. A player opens the exact shared link or copies the approved Chime/USDT destination. Chime also displays the supplied QR image.
3. After paying, the player uploads a PNG/JPG/WebP confirmation screenshot.
4. DreamFyre creates a pending payment and game-credit request.
5. Authorized staff opens the protected proof, independently verifies the payment, adds provider credits and completes or rejects the request.
6. Changing a payment link or receiving destination in the admin portal updates it for every future player request without a code deployment.

## Local setup

    npm install
    cp .env.example .env.local
    npm run dev

For local-only work, set TURSO_DATABASE_URL=file:./dreamfyre-local.db and leave TURSO_AUTH_TOKEN blank. Never use a local SQLite file as Vercel production storage.

## Verification

Run the complete release gate:

    npm test

It runs ESLint, TypeScript checking and an optimized Next.js build. The completed acceptance workflow also verifies registration, email verification, referral qualification, a game request, staff fulfilment, encrypted credential reveal, central game and payment links, public/player contact channels, payment proof, deposit approval, content publishing and the staff gameplay block.

For a repeatable API workflow test against a fresh local database, see docs/ACCEPTANCE_TEST.md and npm run smoke.

## Documentation

- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Delivery notes](DELIVERY_NOTES.md)
- [Vercel deployment](docs/VERCEL_DEPLOYMENT.md)
- [Acceptance testing](docs/ACCEPTANCE_TEST.md)
- [Project operations](docs/PROJECT_OPERATIONS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [External integrations](docs/INTEGRATIONS.md)
- [Client link configuration](docs/CLIENT_LINK_CONFIGURATION.md)
- [Team handoff](docs/TEAM_HANDOFF.md)
- [Design system](docs/DESIGN_SYSTEM.md)

Before real-money launch, the operator must obtain the required licences and provider agreements, publish lawyer-approved policies, configure payment/KYC/email/OAuth services, complete an independent security review, and establish fraud, reconciliation, dispute, backup and incident procedures.
