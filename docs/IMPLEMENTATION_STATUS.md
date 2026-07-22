# Implementation status

Status meanings:

- Implemented: works inside DreamFyre and persists in Turso.
- Manual/provider-ready: DreamFyre workflow works; staff or an external provider performs the real-world step.
- External service required: UI/entry point exists but production behavior needs the client’s approved third-party account or API.

| Requirement | Status | Notes |
| --- | --- | --- |
| Public homepage and game catalogue | Implemented | Browsable before login; Play asks visitor to sign in |
| Registration, login and logout | Implemented | Email/password with secure cookie sessions |
| Forgot/reset password | Implemented | Email OTP delivery requires Resend |
| Email verification | Implemented | Email delivery requires Resend |
| Google/Apple/Microsoft login | External service required | OAuth flow implemented; add official client IDs/secrets |
| Email two-factor authentication | Implemented | Email delivery requires Resend |
| Profile and contact editing | Implemented | Full/display name, username/player ID, email/Gmail, phone, address and profile photo; password confirmation protects username/email changes |
| Login history and device management | Implemented | Device revoke and security event history |
| Age confirmation | Implemented | Required before restricted requests |
| KYC and location review | Manual/provider-ready | Admin review and withdrawal gate implemented; vendor automation not connected |
| Player dashboard and wallet | Implemented | Balances, activity, history, notifications; Home lists only games the player added or requested |
| Deposits | Manual/provider-ready | Link- or destination-based payment details, proof upload, pending ledger and staff completion |
| Withdrawals | Manual/provider-ready | KYC gate, reserve logic and finance queue |
| Player transfers | Implemented | Player-ID lookup and atomic wallet updates |
| Payment methods | Manual/provider-ready | Supplied PayPal/Cash App/Google/Apple links, Chime tag/QR and USDT destination are configured; Venmo/Stripe/Card are Coming Soon; staff confirms proof before crediting |
| Automated payment validation | External service required | Requires merchant gateway API/webhooks; screenshots are not auto-approved |
| Games/search/categories | Implemented | 31 listed titles; supplied local artwork is used where available and branded fallbacks cover newly listed providers |
| Favorites/recent activity | Implemented | Launch records are persistent |
| Game account request | Implemented | Pending loader never displays fake credentials |
| Staff account fulfilment | Manual/provider-ready | Staff enters only real ID/password/reference |
| Game password reveal/reset | Manual/provider-ready | Encrypted reveal; provider reset processed by Game Ops |
| Central player/admin URLs | Implemented | 28 supplied player URLs power Play; agent/admin URLs are protected in the staff portal; super admin can replace either |
| Actual third-party gameplay | External provider | Supplied links open the external provider sites; their uptime, accounts, game behavior and authorization remain outside DreamFyre |
| Provider balances/results/resume | External service required | Requires official provider APIs |
| Promotions/promo codes | Implemented | Admin creation and player claims |
| Referral links/rewards/history | Implemented | Qualifies once on invited player’s first completed deposit |
| Welcome bonus/cashback | Configurable/inactive | Enable only after client approves business rules |
| Notifications | Implemented | Account/payment/game/security updates and broadcasts |
| In-app support and tickets | Implemented | Player-to-staff messages and ticket state |
| Live chat and contact choices | Implemented/manual | In-portal chat works; super admin manages Gmail, Facebook, Instagram and WhatsApp destinations. Real-time third-party inbox automation still needs official APIs |
| Responsible gaming | Implemented | Deposit limits, suspension request and timed self-exclusion |
| FAQ/promotion/legal search | Implemented | Public search included |
| Super admin | Implemented | Creates/assigns staff and manages game, payment and contact links |
| Role-based staff console | Implemented | Support, Game Ops, Finance, Admin, Super Admin |
| Staff gameplay prevention | Implemented | Enforced server-side with HTTP 403 |
| Game/payment/user/KYC management | Implemented | Permission-aware queues and controls |
| CMS, banners and broadcasts | Implemented | Published content appears publicly |
| Reports and audit logs | Implemented | Revenue, user, referral and operations data |
| Fraud queue and baseline rules | Implemented | Duplicate proof, repeated-login and configurable large-transaction alerts; professional scoring still requires a provider |
| Legal pages | Implemented CMS | Final copy requires client/legal approval |
| Database persistence | Implemented | Turso/libSQL; automatic idempotent initialization |
| Production backups/monitoring/WAF | Operations required | Configure outside the application |

## Product boundaries

This repository does not contain unofficial casino APIs, automatic money movement, automatic identity verification, legal approval or licensing. Those require contracts, credentials and jurisdiction-specific approval. The code fails safely where they are unavailable: Play is disabled without a configured game URL, email flows report missing delivery configuration, and payment/KYC requests remain pending for authorized staff.
