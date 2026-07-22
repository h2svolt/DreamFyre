# DreamFyre delivery notes

Release date: 2026-07-22

## Release checks passed

- ESLint
- TypeScript no-emit check
- Optimized Next.js production build
- Fresh-database API acceptance workflow
- 31 game/provider seed verification, including 28 supplied player and staff-only agent URLs
- 10 payment-method seed verification
- Supplied PayPal, Cash App, Google/Apple Pay links plus Chime tag/QR and USDT TRC20 destination; protected screenshot review and central replacement controls
- Gmail/Facebook/Instagram/WhatsApp contact-link management plus in-portal live chat
- Central per-game Play URL, protected staff-only provider-admin URL and staff-without-URL fulfilment
- Encrypted Game ID/password completion and player-only reveal
- Staff gameplay route blocked with HTTP 403
- Payment proof, deposit completion and game-credit redemption
- Signed-in Home restricted to the player’s added or pending games
- Editable player name, username, Gmail/email, phone and profile picture
- Daily wheel range updated to 0.25–5 FP
- Referral qualification and one-time reward
- KYC approval and withdrawal completion
- Promotion claim, homepage banner, legal CMS and broadcast notification
- Repeated-failed-login fraud alert

## Required client inputs before launch

- Official Play URL for the remaining titles that were not included in the client-supplied URL list
- Venmo, Stripe, Card Payment and any future BTC payment details before those methods are enabled
- Resend account and verified sending domain
- Google, Apple and Microsoft OAuth credentials if enabled
- Approved Gmail and WhatsApp destinations; the supplied Facebook and Instagram pages are already configured
- Approved legal/compliance content, licences and operating locations
- KYC/geolocation/provider decisions and production policies

## Important implementation rule

Game Operations never enters a Play URL for an individual player. The super administrator configures one approved URL per title under Platform Links. Every active account for that title uses the same embedded URL automatically. Payment links follow the same central-configuration rule and can be replaced from Payments without a new deployment.

See README.md and docs/IMPLEMENTATION_STATUS.md for the full handoff.
