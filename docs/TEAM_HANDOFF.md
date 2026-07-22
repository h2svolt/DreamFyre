# DreamFyre team handoff

## Delivered application

The repository is a complete buildable Next.js/Vercel application containing the public site, player portal, staff operations console, super-admin controls, persistent database schema and internal business workflows described in IMPLEMENTATION_STATUS.md.

“Implemented” means the DreamFyre-side UI, validation, authorization and database behavior exists. It does not mean an external game/payment/KYC service is live without that provider’s official credentials.

## Ownership after handoff

### Development team

1. Keep dependencies patched and run npm test before every release.
2. Configure Turso, Resend and OAuth applications in each Vercel environment.
3. Add official gateway/provider adapters only from approved documentation.
4. Add production rate limiting, monitoring and error reporting.
5. Maintain migrations/backups and test recovery.
6. Commission a security review before real-money launch.

### Super administrator

1. Create named Support, Game Operations, Finance and Admin accounts.
2. Configure one official player URL per game under Platform Links when supplied.
3. Review user/staff access regularly and suspend unused accounts.
4. Configure a current payment/checkout link for each enabled method; replace it whenever the receiving link changes.
5. Verify the preconfigured Facebook and Instagram pages, then configure approved Gmail and WhatsApp destinations.
6. Publish approved banners, promotions, notifications and legal pages.

### Game Operations

1. Create/reset the player account in the authorized provider panel.
2. Enter the exact player Game ID, temporary password and provider reference.
3. Never enter or send per-player Play URLs; the title already owns the link.
4. Complete/reject only after confirming the provider operation.

### Finance

1. Independently verify deposits; a screenshot alone is not confirmation.
2. Reconcile provider references and DreamFyre ledger entries.
3. Verify KYC/payout eligibility and destination before marking paid.
4. Investigate duplicate, failed, reversed and suspicious transactions.

### Support

1. Respond only through assigned player channels/tickets.
2. Never request provider-admin passwords or full card credentials.
3. Escalate game resets, finance disputes, fraud and KYC to the correct role.

### Client/legal/compliance

1. Confirm entity, brand, operating locations and legal age.
2. Obtain gaming/payment/provider permissions and artwork rights.
3. Approve Terms, Privacy, Responsible Gaming, Cookies and Disclaimer copy.
4. Approve KYC/AML, sanctions, fraud, refund, dispute and self-exclusion policies.
5. Supply final Gmail/WhatsApp destinations and any remaining official payment/game details; Facebook and Instagram are already seeded.

## Configuration that must be supplied

- Turso database URL/token
- stable 32-byte credential-encryption key
- super-admin email list
- Resend key and verified sender domain
- Google, Microsoft and Apple OAuth apps if social login is enabled
- official player URL for any remaining title not covered by the supplied provider-link list
- Venmo, Stripe, Card Payment and optional BTC details before those methods are enabled
- final Gmail and WhatsApp information; supplied Facebook and Instagram pages are already seeded

## Release sequence

### 1. Preview acceptance

- Deploy a Vercel Preview with test-only accounts.
- Run docs/ACCEPTANCE_TEST.md on desktop and real phones.
- Get written approval for layout, wording and game imagery.

### 2. Operational hardening

- Enable production email, monitoring, rate limiting and backups.
- Define staff permissions and create individual accounts.
- Test database restore and incident response.
- Complete independent security/privacy assessment.

### 3. External integrations

- Connect selected payment/payout services with signed webhooks.
- Connect KYC/geolocation provider if required.
- Add game APIs only when official credentials/documentation exist.
- Run reconciliation, retry and idempotency tests.

### 4. Controlled launch

- Publish approved legal pages and responsible-gaming rules.
- Configure production domain/DNS and all callback URLs.
- Start with agreed limits and close monitoring.

## Do not do these things

- Do not commit .env files, database tokens or encryption keys.
- Do not hardcode provider admin credentials or player passwords.
- Do not guess game URLs or scrape private APIs.
- Do not expose AUTH_PREVIEW_OTP=true in production.
- Do not store raw card numbers/CVV.
- Do not claim payment/KYC/provider automation before official integrations pass acceptance tests.
