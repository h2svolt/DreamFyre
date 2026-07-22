# External integrations

DreamFyre’s application workflows are implemented. The items below cannot be made live by source code alone: each requires an official merchant/provider account, approved credentials, contractual permission and production configuration from the client.

## Game provider links and APIs

### Current release: manual provider operations

- A player requests an account in DreamFyre.
- Game Operations creates the account in the provider’s authorized agent panel.
- Staff enters only the Game ID, temporary password and provider reference.
- The super admin saves one approved Play URL for each title under Admin → Platform Links.
- All player accounts for that game automatically use its central URL.
- Staff does not send or enter a URL for each customer.
- Password resets and credit loads remain staff-processed until official APIs are supplied.

The configured catalogue is Milky Way, Fire Kirin, Juwa, Juwa 2.0, Game Vault 999, Mr All In One, YOLO 777, Orion Stars, Panda Master, Ultra Panda, Game Room, V Blink, River Sweep, Vegas Sweep, Cash Frenzy, Billion Balls, Hi-Rollin, Las Vegas and Mega Spin.

The previously supplied Orion Stars address is treated as an operations/agent portal, not an API. Provider admin credentials belong in the client’s password manager and must never be stored in DreamFyre.

### Future official API automation

For automatic account creation, balances, credit/debit and game results, each provider must supply:

- sandbox and production API base URLs
- server authentication method and allowed IPs
- create-account/reset-password endpoints
- balance, credit and debit endpoints
- transaction lookup and idempotency/reference support
- signed webhook documentation, error codes, limits and retry policy

An internal provider adapter should expose createAccount, resetPassword, getBalance, credit, debit and getTransaction. Do not scrape public websites or reverse-engineer private endpoints.

## Payment and payout methods

The admin UI and player request flow include:

| Method | Current behavior | Needed for automatic processing |
| --- | --- | --- |
| Venmo | Coming Soon / disabled | Approved business integration/provider |
| PayPal | Supplied hosted link + manual proof review | PayPal business app, webhooks and credentials |
| Chime | Supplied tag and QR + manual proof review | Approved transfer/payout partner |
| Stripe | Coming Soon / disabled | Stripe account, Payment Intents and signed webhooks |
| Google Pay | Supplied hosted card link + manual proof review | Supported gateway + merchant verification |
| Apple Pay | Supplied hosted card link + manual proof review | Supported gateway, merchant domain verification |
| Cash App | Supplied hosted link + manual proof review | Approved business payment integration |
| Card Payment | Coming Soon / disabled | PCI-compliant gateway-hosted payment fields |
| BTC | Disabled until an approved address is supplied | Custody/payment processor and confirmation webhooks |
| USDT TRC20 | Supplied TRC20 destination + manual proof review | Wallet/processor, confirmation policy and screening |

The current build supports either a reusable checkout URL or an approved receiving destination per method. Only the super administrator can replace checkout URLs; authorized payment staff manages instructions/destinations. A player uses the configured details before uploading private proof; DreamFyre then creates a pending transaction and lets authorized staff process it. A screenshot is evidence for review, not automatic payment validation.

For gateway automation require server-created payment intents, signed webhook verification, provider transaction lookup, idempotency keys, refund/dispute events and reconciliation. Never store raw card numbers or CVV in DreamFyre.

Automatic withdrawals require beneficiary validation, payout creation, status/refund webhooks, transaction screening and failure/reversal handling. Until then, the finance queue safely reserves the requested balance and records the manual outcome.

## Email delivery

Password recovery, email verification and email 2FA are implemented through Resend’s HTTP API.

Required:

- RESEND_API_KEY
- EMAIL_FROM using a verified sending domain
- AUTH_PREVIEW_OTP=false in production

AUTH_PREVIEW_OTP=true is only for local/controlled testing because it returns codes in the API response. Never enable it on a public deployment.

## Social sign-in

The code supports Google, Microsoft/Hotmail and Apple. Register one web application with each provider and add the exact callback URLs:

- https://YOUR_DOMAIN/api/oauth/google/callback
- https://YOUR_DOMAIN/api/oauth/microsoft/callback
- https://YOUR_DOMAIN/api/oauth/apple/callback

Set the matching client ID and secret environment variables. Apple’s client secret is normally a signed JWT with an expiry and therefore needs a rotation process. Never request or store a user’s Google, Microsoft or Apple password.

## KYC, age and location

The product contains age confirmation, verification requests, admin approval and withdrawal gating. Automated identity documents, liveness, sanctions/PEP screening and geolocation are not connected because no regulated vendor was selected.

Before launch, choose approved KYC and geolocation vendors for every operating region. Use vendor-hosted secure capture or encrypted object storage; do not place identity documents into support notes.

## Support and contact channels

In-app live-chat messages and tickets work now. Gmail, Facebook, Instagram and WhatsApp destinations are stored centrally and can be changed by the super administrator without redeploying. Real-time third-party inbox sync, WhatsApp Business automation or a help-desk connection still requires the official API/account and consent/retention configuration.

## Environment variable inventory

Required for the core hosted app:

    TURSO_DATABASE_URL
    TURSO_AUTH_TOKEN
    ADMIN_EMAILS
    GAME_CREDENTIAL_ENCRYPTION_KEY

Required for production email:

    RESEND_API_KEY
    EMAIL_FROM
    AUTH_PREVIEW_OTP=false

Optional social sign-in pairs:

    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
    MICROSOFT_CLIENT_ID
    MICROSOFT_CLIENT_SECRET
    APPLE_CLIENT_ID
    APPLE_CLIENT_SECRET

Future payment, KYC and game-provider secrets should be added only when their specific integrations are implemented. Never commit any real secret to Git.

Optional baseline fraud-review thresholds are FRAUD_FAILED_LOGIN_THRESHOLD, FRAUD_LARGE_TRANSFER_THRESHOLD, FRAUD_LARGE_DEPOSIT_THRESHOLD and FRAUD_LARGE_WITHDRAWAL_THRESHOLD. These only create staff review alerts; they do not replace a regulated fraud/AML service.

Set NEXT_PUBLIC_SUPPORT_EMAIL and NEXT_PUBLIC_SUPPORT_WHATSAPP_URL to show client-approved public contact links. When unset, DreamFyre shows that the operator must configure the channel and does not publish a fake address.
