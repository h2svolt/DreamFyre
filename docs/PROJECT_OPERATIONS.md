# How DreamFyre operates

## Public visitor journey

A visitor can browse the homepage, game catalogue, promotions, FAQ/support and legal pages without signing in. Clicking a Play action sends the visitor to registration/login. Public pages show only active/published content from the admin CMS.

## Player account journey

Players can register by email/password or use configured Google, Apple or Microsoft sign-in. Email accounts support verification, forgot/reset password and optional email 2FA. Social accounts are email-verified by the identity provider but must still confirm eligible age in Profile.

The player Account Center handles profile/contact editing, profile image, password changes, known devices, login history, notifications, KYC requests, deposit limits and self-exclusion.

## Staff roles

| Role | Main rights |
| --- | --- |
| Support | Player conversations and support tickets |
| Game Operations | Game-account, password-reset and game-credit queues |
| Finance | Withdrawals and payment-method configuration |
| Administrator | Users, KYC, content, reports, fraud review and most operations |
| Super Administrator | All administrator rights plus create staff and configure central player, provider-admin and payment links |

Staff accounts cannot open player gameplay/wallet actions. The first super admin is established through ADMIN_EMAILS; only that role can create additional staff accounts. Use individual accounts, not a shared password.

## Game account lifecycle

| Stage | Player sees | Operations action |
| --- | --- | --- |
| Available | Game card and request button | None |
| Pending | Animated “Creating your game account” loader; no ID/password | Create account in official provider panel |
| Processing | Neutral progress status; no credentials | Verify provider result |
| Active | Game ID, protected password and Play state | Maintain account and handle credits/resets |
| Rejected | Rejection status/note | Record a clear reason and close request |

To complete a new account, Game Operations enters the exact Game ID, password and optional provider reference. Staff never enters the Play URL. Supplied player and agent links are seeded centrally; the super admin can replace either link. Players receive only the player URL, while authorized staff can open the provider-admin URL from Game Operations. If a player URL is not configured, credentials remain available but Play stays disabled.

Passwords are encrypted at rest. Reveal and reset events are restricted and audited. Provider-panel admin passwords must never be entered into DreamFyre.

## Deposits and game credits

1. The super admin saves the current checkout/payment link for link-based methods. Finance configures receiving destinations and instructions.
2. The player selects a method, game and amount, then opens the configured link or copies the approved destination. Chime displays its supplied QR image and tag; USDT displays the TRC20 address.
3. DreamFyre refuses a new deposit when neither an approved link nor a receiving destination is configured.
4. DreamFyre stores the proof privately and creates a pending transaction plus game-credit request.
5. Staff opens the protected screenshot, verifies payment outside DreamFyre and loads credits in the provider panel.
6. Staff records the provider reference and completes or rejects the request.
7. Completion updates the ledger/account state and notifies the player.

PayPal, Cash App, Google Pay and Apple Pay use the supplied hosted links. Chime uses the supplied tag and QR image. USDT uses the supplied TRC20 address. Venmo, Stripe and Card Payment are disabled as Coming Soon; BTC remains disabled until an approved address is supplied. These are manual proof-review workflows, not automatic gateways.

## Withdrawals

Email verification, age confirmation and approved identity verification are required. The amount moves from cash to reserved balance when requested. Finance may mark it processing, paid or rejected. Paid releases the reserve; rejected returns the amount to cash. Bank, wallet and crypto payouts remain manual until an official payout integration is configured.

## Transfers

Players find a recipient using the DreamFyre player ID and transfer available cash. Debit, credit and both ledger descriptions execute together. The team must approve production limits, velocity rules and fraud policy.

## Referrals and promotions

Each player gets a /join/[referral-code] link. The reward is issued once when the invited player’s first deposit is completed by staff. Admins can create promotions/codes; players claim active eligible codes from Account Center. Welcome bonus and cashback are disabled until the client approves final terms.

## KYC and responsible gaming

Players submit verification type, evidence type/reference and a note. Administrators approve/reject through the KYC queue. This is a manual workflow; identity document capture and automated screening require a selected vendor.

Players can set a server-enforced per-deposit limit, request suspension or self-exclude for a selected period. Self-exclusion ends active sessions and blocks access for that period.

## Support

Players can send in-app live-chat messages and structured support tickets. The super admin can publish or replace Gmail, Facebook, Instagram and WhatsApp contact destinations from Platform Links. Support/admin roles can reply to players and manage ticket state. Provider-password reset requests enter the Game Operations queue; staff changes the password in the official provider panel, then saves the replacement encrypted password.

## Content and notifications

Admins manage promotions, homepage banners, player broadcasts and five legal CMS pages. Draft legal pages are private. Only published content replaces the public fallback. All legal wording must be client/lawyer approved.

## Daily operational routine

1. Review new deposits and payment proofs against the actual payment account.
2. Process game-account, credit, reset and withdrawal queues.
3. Answer player messages and tickets.
4. Review KYC and fraud flags using the approved policy.
5. Reconcile provider references against wallet/transaction reports.
6. Review audit logs and unusual login/device activity.
7. Check backups, error monitoring and support coverage.

## Non-negotiable controls

- Never invent game credentials or use scraped launch URLs.
- Never treat a screenshot alone as confirmed payment.
- Never place provider admin credentials, full payout details or identity documents in notes.
- Never share staff accounts.
- Never change the credential-encryption key without a migration.
- Never use local SQLite as Vercel production storage.
- Do not accept real money before legal, licensing, compliance and security approval.
