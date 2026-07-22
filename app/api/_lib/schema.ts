import { GAME_CATALOG } from "../../lib/game-catalog";
import { PROVIDER_GAME_LINKS } from "./provider-game-links";

type DatabaseLike = Pick<Database, "prepare" | "batch">;

const schemaInitializations = new WeakMap<DatabaseLike, Promise<void>>();
const gameSeedInitializations = new WeakMap<DatabaseLike, Promise<void>>();

export async function initializeSchema(db: DatabaseLike) {
  const existing = schemaInitializations.get(db);
  if (existing) return existing;
  const initialization = db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, player_tag TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'player', status TEXT NOT NULL DEFAULT 'active', referral_code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS credentials (user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT NOT NULL, accent TEXT NOT NULL, api_status TEXT NOT NULL DEFAULT 'awaiting_credentials', enabled INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, game_id TEXT NOT NULL, username TEXT NOT NULL, encrypted_password TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_account_metadata (account_id TEXT PRIMARY KEY, balance REAL NOT NULL DEFAULT 0, launch_url TEXT, balance_updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS wallets (user_id TEXT PRIMARY KEY, cash_balance REAL NOT NULL DEFAULT 0, freeplay_balance REAL NOT NULL DEFAULT 0, referral_balance REAL NOT NULL DEFAULT 0, reserved_balance REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL, provider TEXT, game_id TEXT, proof_key TEXT, description TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS payment_proofs (proof_key TEXT PRIMARY KEY, user_id TEXT NOT NULL, mime_type TEXT NOT NULL, data BLOB NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS payment_proofs_user_created_idx ON payment_proofs(user_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS withdrawals (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL, destination_masked TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS transfers (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, recipient_id TEXT NOT NULL, amount REAL NOT NULL, note TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS referrals (id TEXT PRIMARY KEY, referrer_id TEXT NOT NULL, referred_email TEXT NOT NULL, status TEXT NOT NULL, reward REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS referrals_email_idx ON referrals(referred_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS referrals_referrer_created_idx ON referrals(referrer_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, sender_role TEXT NOT NULL, channel TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, game_id TEXT NOT NULL, transaction_id TEXT, request_type TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, game_username TEXT, status TEXT NOT NULL, staff_note TEXT, provider_reference TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS operation_links (entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, transaction_id TEXT NOT NULL, PRIMARY KEY(entity_type, entity_id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS engagement_actions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action_key TEXT NOT NULL, reward_type TEXT NOT NULL, reward_amount REAL NOT NULL DEFAULT 0, metadata TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_favorites (user_id TEXT NOT NULL, game_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id, game_id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_launch_links (game_id TEXT PRIMARY KEY, launch_url TEXT, updated_by TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_provider_links (game_id TEXT PRIMARY KEY, admin_url TEXT, updated_by TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY, avatar_url TEXT, phone TEXT, date_of_birth TEXT, country TEXT, region TEXT, address TEXT, age_confirmed INTEGER NOT NULL DEFAULT 0, email_verified INTEGER NOT NULL DEFAULT 0, contact_preferences TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS profile_images (user_id TEXT PRIMARY KEY, mime_type TEXT NOT NULL, data BLOB NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS security_settings (user_id TEXT PRIMARY KEY, two_factor_enabled INTEGER NOT NULL DEFAULT 0, deposit_limit REAL, self_excluded_until TEXT, suspension_requested INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS auth_challenges (id TEXT PRIMARY KEY, user_id TEXT, email TEXT NOT NULL, challenge_type TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, provider TEXT NOT NULL, code_verifier TEXT NOT NULL, nonce TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS oauth_accounts (provider TEXT NOT NULL, provider_account_id TEXT NOT NULL, user_id TEXT NOT NULL, email TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(provider, provider_account_id))"),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_challenges_email_type_idx ON auth_challenges(email, challenge_type, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS login_events (id TEXT PRIMARY KEY, user_id TEXT, email TEXT NOT NULL, event_type TEXT NOT NULL, ip_address TEXT, user_agent TEXT, device_id TEXT, success INTEGER NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS login_events_user_created_idx ON login_events(user_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS user_devices (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, label TEXT NOT NULL, user_agent TEXT, last_ip TEXT, trusted INTEGER NOT NULL DEFAULT 0, last_seen_at TEXT NOT NULL, revoked_at TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS user_devices_user_seen_idx ON user_devices(user_id, last_seen_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, notification_type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS verification_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, verification_type TEXT NOT NULL, status TEXT NOT NULL, document_type TEXT, reference TEXT, note TEXT, reviewed_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON verification_requests(status, created_at ASC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY, code TEXT UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL, reward_type TEXT NOT NULL, reward_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, starts_at TEXT, ends_at TEXT, wager_requirement REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS promotion_claims (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, promotion_id TEXT NOT NULL, status TEXT NOT NULL, wager_progress REAL NOT NULL DEFAULT 0, claimed_at TEXT NOT NULL, UNIQUE(user_id, promotion_id))"),
    db.prepare("CREATE INDEX IF NOT EXISTS promotion_claims_user_idx ON promotion_claims(user_id, claimed_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_activity (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, game_id TEXT NOT NULL, game_account_id TEXT, event_type TEXT NOT NULL, result TEXT, amount REAL NOT NULL DEFAULT 0, session_reference TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS game_activity_user_created_idx ON game_activity(user_id, created_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'open', assigned_to TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status, updated_at DESC)"),
    db.prepare("CREATE TABLE IF NOT EXISTS cms_pages (slug TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS promotional_banners (id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, cta_label TEXT, cta_url TEXT, image_url TEXT, status TEXT NOT NULL, starts_at TEXT, ends_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS payment_method_configs (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, method_type TEXT NOT NULL, network TEXT, instructions TEXT, destination TEXT, enabled INTEGER NOT NULL DEFAULT 1, updated_by TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS payment_method_links (method_id TEXT PRIMARY KEY, payment_url TEXT, updated_by TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS support_channel_configs (id TEXT PRIMARY KEY, label TEXT NOT NULL, channel_type TEXT NOT NULL, destination TEXT, enabled INTEGER NOT NULL DEFAULT 0, updated_by TEXT, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fraud_alerts (id TEXT PRIMARY KEY, user_id TEXT, alert_type TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, description TEXT NOT NULL, reviewed_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fraud_alerts_status_idx ON fraud_alerts(status, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions(user_id, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS transfers_sender_idx ON transfers(sender_id, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS game_requests_user_created_idx ON game_requests(user_id, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS game_requests_status_created_idx ON game_requests(status, created_at ASC)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS engagement_user_action_idx ON engagement_actions(user_id, action_key)"),
  ]).then(() => undefined);
  schemaInitializations.set(db, initialization);
  try {
    await initialization;
  } catch (error) {
    schemaInitializations.delete(db);
    throw error;
  }
}

export async function seedGames(db: DatabaseLike) {
  const existing = gameSeedInitializations.get(db);
  if (existing) return existing;
  const initialization = (async () => {
    await db.prepare("UPDATE games SET enabled = 0").run();
    await db.batch(GAME_CATALOG.map((g) => db.prepare(
      "INSERT INTO games (id,name,short_name,accent,api_status,enabled) VALUES (?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,short_name=excluded.short_name,accent=excluded.accent,api_status=excluded.api_status,enabled=1"
    ).bind(g.id, g.name, g.shortName, g.accent, "staff_processed")));
    const seededAt = new Date().toISOString();
    await db.batch(GAME_CATALOG.map((game) => db.prepare(
      "INSERT INTO game_launch_links (game_id,launch_url,updated_by,updated_at) VALUES (?,?,NULL,?) ON CONFLICT(game_id) DO UPDATE SET launch_url=CASE WHEN game_launch_links.updated_by IS NULL THEN excluded.launch_url ELSE game_launch_links.launch_url END,updated_at=CASE WHEN game_launch_links.updated_by IS NULL THEN excluded.updated_at ELSE game_launch_links.updated_at END"
    ).bind(game.id, PROVIDER_GAME_LINKS[game.id]?.playerUrl ?? null, seededAt)));
    await db.batch(GAME_CATALOG.map((game) => db.prepare(
      "INSERT INTO game_provider_links (game_id,admin_url,updated_by,updated_at) VALUES (?,?,NULL,?) ON CONFLICT(game_id) DO UPDATE SET admin_url=CASE WHEN game_provider_links.updated_by IS NULL THEN excluded.admin_url ELSE game_provider_links.admin_url END,updated_at=CASE WHEN game_provider_links.updated_by IS NULL THEN excluded.updated_at ELSE game_provider_links.updated_at END"
    ).bind(game.id, PROVIDER_GAME_LINKS[game.id]?.adminUrl ?? null, seededAt)));
    const methods: Array<[string, string, string, string | null, number, string, string | null, string | null]> = [
      ["venmo", "Venmo", "wallet", null, 0, "Coming soon. The super administrator will enable Venmo when the approved payment link is available.", null, null],
      ["paypal", "PayPal", "wallet", null, 1, "Open the PayPal payment page, complete the payment, then upload the confirmation screenshot.", null, "https://taptapup.com/cashme/nex-play-paytap/"],
      ["chime", "Chime", "wallet", null, 1, "Send through Chime using the displayed tag or QR code, then upload the confirmation screenshot.", "$Isaiah-Santiago-65", null],
      ["stripe", "Stripe", "gateway", null, 0, "Coming soon. Stripe will be enabled after the approved checkout link is supplied.", null, null],
      ["google-pay", "Google Pay", "wallet", null, 1, "Open the secure card page, choose Google Pay, complete payment, then upload the confirmation screenshot.", null, "https://taptapup.com/cashme/nex-play-card/"],
      ["apple-pay", "Apple Pay", "wallet", null, 1, "Open the secure card page, choose Apple Pay, complete payment, then upload the confirmation screenshot.", null, "https://taptapup.com/cashme/nex-play-card/"],
      ["cash-app", "Cash App", "wallet", null, 1, "Open the Cash App payment page, complete the payment, then upload the confirmation screenshot.", null, "https://taptapup.com/cashme/nex-play-ezpay/"],
      ["card", "Card Payment", "card", null, 0, "Coming soon. Card Payment will be enabled when the approved checkout link is available.", null, null],
      ["btc", "BTC", "crypto", "Bitcoin", 0, "Bitcoin payments are unavailable until the operator supplies an approved wallet address.", null, null],
      ["usdt-trc20", "USDT (TRC20)", "crypto", "TRON (TRC20)", 1, "Send only USDT using the TRON TRC20 network. Upload the completed transfer screenshot for staff confirmation.", "TUnjBnqiSvs4oYmRWo7oWquMycXZdzdepe", null],
    ];
    await db.batch(methods.map((method) => db.prepare("INSERT INTO payment_method_configs (id,name,method_type,network,instructions,destination,enabled,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,method_type=excluded.method_type,network=excluded.network,instructions=CASE WHEN payment_method_configs.updated_by IS NULL THEN excluded.instructions ELSE payment_method_configs.instructions END,destination=CASE WHEN payment_method_configs.updated_by IS NULL THEN excluded.destination ELSE payment_method_configs.destination END,enabled=CASE WHEN payment_method_configs.updated_by IS NULL THEN excluded.enabled ELSE payment_method_configs.enabled END,updated_at=CASE WHEN payment_method_configs.updated_by IS NULL THEN excluded.updated_at ELSE payment_method_configs.updated_at END").bind(method[0], method[1], method[2], method[3], method[5], method[6], method[4], seededAt)));
    await db.batch(methods.map((method) => db.prepare("INSERT INTO payment_method_links (method_id,payment_url,updated_by,updated_at) VALUES (?,?,NULL,?) ON CONFLICT(method_id) DO UPDATE SET payment_url=CASE WHEN payment_method_links.updated_by IS NULL THEN excluded.payment_url ELSE payment_method_links.payment_url END,updated_at=CASE WHEN payment_method_links.updated_by IS NULL THEN excluded.updated_at ELSE payment_method_links.updated_at END").bind(method[0], method[7], seededAt)));
    const supportChannels: Array<[string, string, string, string | null]> = [
      ["gmail", "Gmail", "email", process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null],
      ["facebook", "Facebook Page", "social", process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "https://www.facebook.com/share/1Ae4DF9Rnf/"],
      ["instagram", "Instagram Page", "social", process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/dream.fyre234/"],
      ["whatsapp", "WhatsApp", "social", process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL?.trim() || null],
    ];
    await db.batch(supportChannels.map((channel) => db.prepare("INSERT INTO support_channel_configs (id,label,channel_type,destination,enabled,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,channel_type=excluded.channel_type,destination=CASE WHEN support_channel_configs.updated_by IS NULL THEN excluded.destination ELSE support_channel_configs.destination END,enabled=CASE WHEN support_channel_configs.updated_by IS NULL THEN excluded.enabled ELSE support_channel_configs.enabled END,updated_at=CASE WHEN support_channel_configs.updated_by IS NULL THEN excluded.updated_at ELSE support_channel_configs.updated_at END").bind(channel[0], channel[1], channel[2], channel[3], channel[3] ? 1 : 0, seededAt)));
    const promotions: Array<[string, string | null, string, string, string, number, string, number]> = [
      ["promo-referral", null, "Referral rewards", "Invite a verified player and earn after their qualifying activity.", "referral", 5, "active", 0],
      ["promo-cashback", "FYREBACK", "Cashback trial", "A configurable cashback offer for eligible verified players.", "freeplay", 5, "inactive", 25],
      ["promo-welcome", "WELCOME", "Welcome offer", "Optional new-player reward controlled by the operator.", "freeplay", 10, "inactive", 50],
    ];
    await db.batch(promotions.map((promo) => db.prepare("INSERT INTO promotions (id,code,title,description,reward_type,reward_amount,status,wager_requirement,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(...promo, seededAt, seededAt)));
  })();
  gameSeedInitializations.set(db, initialization);
  try {
    await initialization;
  } catch (error) {
    gameSeedInitializations.delete(db);
    throw error;
  }
}
