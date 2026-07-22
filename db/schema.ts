import { blob, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull().unique(), displayName: text("display_name").notNull(),
  playerTag: text("player_tag").notNull().unique(), role: text("role").notNull().default("player"),
  status: text("status").notNull().default("active"), referralCode: text("referral_code").notNull().unique(), createdAt: text("created_at").notNull(),
});
export const credentials = sqliteTable("credentials", {
  userId: text("user_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("sessions_user_idx").on(table.userId)]);
export const games = sqliteTable("games", {
  id: text("id").primaryKey(), name: text("name").notNull(), shortName: text("short_name").notNull(), accent: text("accent").notNull(),
  apiStatus: text("api_status").notNull().default("staff_processed"), enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});
export const gameAccounts = sqliteTable("game_accounts", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), gameId: text("game_id").notNull(), username: text("username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(), status: text("status").notNull(), createdAt: text("created_at").notNull(),
});
export const gameAccountMetadata = sqliteTable("game_account_metadata", {
  accountId: text("account_id").primaryKey(), balance: real("balance").notNull().default(0), launchUrl: text("launch_url"), balanceUpdatedAt: text("balance_updated_at").notNull(),
});
export const wallets = sqliteTable("wallets", {
  userId: text("user_id").primaryKey(), cashBalance: real("cash_balance").notNull().default(0), freeplayBalance: real("freeplay_balance").notNull().default(0),
  referralBalance: real("referral_balance").notNull().default(0), reservedBalance: real("reserved_balance").notNull().default(0), updatedAt: text("updated_at").notNull(),
});
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), type: text("type").notNull(), amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"), status: text("status").notNull(), provider: text("provider"), gameId: text("game_id"),
  proofKey: text("proof_key"), description: text("description").notNull(), createdAt: text("created_at").notNull(),
});
export const paymentProofs = sqliteTable("payment_proofs", {
  proofKey: text("proof_key").primaryKey(),
  userId: text("user_id").notNull(),
  mimeType: text("mime_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("payment_proofs_user_created_idx").on(table.userId, table.createdAt)]);
export const withdrawals = sqliteTable("withdrawals", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), amount: real("amount").notNull(), method: text("method").notNull(),
  destinationMasked: text("destination_masked").notNull(), status: text("status").notNull(), createdAt: text("created_at").notNull(),
});
export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(), senderId: text("sender_id").notNull(), recipientId: text("recipient_id").notNull(), amount: real("amount").notNull(),
  note: text("note"), status: text("status").notNull(), createdAt: text("created_at").notNull(),
});
export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(), referrerId: text("referrer_id").notNull(), referredEmail: text("referred_email").notNull(), status: text("status").notNull(),
  reward: real("reward").notNull().default(0), createdAt: text("created_at").notNull(),
});
export const supportMessages = sqliteTable("support_messages", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), senderRole: text("sender_role").notNull(), channel: text("channel").notNull(),
  message: text("message").notNull(), createdAt: text("created_at").notNull(),
});
export const gameRequests = sqliteTable("game_requests", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), gameId: text("game_id").notNull(), transactionId: text("transaction_id"),
  requestType: text("request_type").notNull(), amount: real("amount").notNull().default(0), gameUsername: text("game_username"),
  status: text("status").notNull(), staffNote: text("staff_note"), providerReference: text("provider_reference"),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const operationLinks = sqliteTable("operation_links", {
  entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), transactionId: text("transaction_id").notNull(),
}, (table) => [primaryKey({ columns: [table.entityType, table.entityId] })]);
export const engagementActions = sqliteTable("engagement_actions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), actionKey: text("action_key").notNull(),
  rewardType: text("reward_type").notNull(), rewardAmount: real("reward_amount").notNull().default(0), metadata: text("metadata"), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("engagement_user_action_idx").on(table.userId, table.actionKey)]);
export const gameFavorites = sqliteTable("game_favorites", {
  userId: text("user_id").notNull(), gameId: text("game_id").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("game_favorites_user_game_idx").on(table.userId, table.gameId)]);
export const gameLaunchLinks = sqliteTable("game_launch_links", {
  gameId: text("game_id").primaryKey(), launchUrl: text("launch_url"), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});
export const gameProviderLinks = sqliteTable("game_provider_links", {
  gameId: text("game_id").primaryKey(), adminUrl: text("admin_url"), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});
export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(), avatarUrl: text("avatar_url"), phone: text("phone"), dateOfBirth: text("date_of_birth"),
  country: text("country"), region: text("region"), address: text("address"), ageConfirmed: integer("age_confirmed", { mode: "boolean" }).notNull().default(false),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false), contactPreferences: text("contact_preferences"), updatedAt: text("updated_at").notNull(),
});
export const profileImages = sqliteTable("profile_images", {
  userId: text("user_id").primaryKey(), mimeType: text("mime_type").notNull(), data: blob("data", { mode: "buffer" }).notNull(), updatedAt: text("updated_at").notNull(),
});
export const securitySettings = sqliteTable("security_settings", {
  userId: text("user_id").primaryKey(), twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
  depositLimit: real("deposit_limit"), selfExcludedUntil: text("self_excluded_until"), suspensionRequested: integer("suspension_requested", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});
export const authChallenges = sqliteTable("auth_challenges", {
  id: text("id").primaryKey(), userId: text("user_id"), email: text("email").notNull(), challengeType: text("challenge_type").notNull(),
  codeHash: text("code_hash").notNull(), expiresAt: text("expires_at").notNull(), usedAt: text("used_at"), attempts: integer("attempts").notNull().default(0), createdAt: text("created_at").notNull(),
}, (table) => [index("auth_challenges_email_type_idx").on(table.email, table.challengeType, table.createdAt)]);
export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(), provider: text("provider").notNull(), codeVerifier: text("code_verifier").notNull(), nonce: text("nonce").notNull(), expiresAt: text("expires_at").notNull(), createdAt: text("created_at").notNull(),
});
export const oauthAccounts = sqliteTable("oauth_accounts", {
  provider: text("provider").notNull(), providerAccountId: text("provider_account_id").notNull(), userId: text("user_id").notNull(), email: text("email").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]);
export const loginEvents = sqliteTable("login_events", {
  id: text("id").primaryKey(), userId: text("user_id"), email: text("email").notNull(), eventType: text("event_type").notNull(), ipAddress: text("ip_address"),
  userAgent: text("user_agent"), deviceId: text("device_id"), success: integer("success", { mode: "boolean" }).notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("login_events_user_created_idx").on(table.userId, table.createdAt)]);
export const userDevices = sqliteTable("user_devices", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), label: text("label").notNull(), userAgent: text("user_agent"), lastIp: text("last_ip"),
  trusted: integer("trusted", { mode: "boolean" }).notNull().default(false), lastSeenAt: text("last_seen_at").notNull(), revokedAt: text("revoked_at"),
}, (table) => [index("user_devices_user_seen_idx").on(table.userId, table.lastSeenAt)]);
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), notificationType: text("notification_type").notNull(), title: text("title").notNull(),
  message: text("message").notNull(), readAt: text("read_at"), createdAt: text("created_at").notNull(),
}, (table) => [index("notifications_user_created_idx").on(table.userId, table.createdAt)]);
export const verificationRequests = sqliteTable("verification_requests", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), verificationType: text("verification_type").notNull(), status: text("status").notNull(),
  documentType: text("document_type"), reference: text("reference"), note: text("note"), reviewedBy: text("reviewed_by"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("verification_requests_status_idx").on(table.status, table.createdAt)]);
export const promotions = sqliteTable("promotions", {
  id: text("id").primaryKey(), code: text("code").unique(), title: text("title").notNull(), description: text("description").notNull(), rewardType: text("reward_type").notNull(),
  rewardAmount: real("reward_amount").notNull().default(0), status: text("status").notNull(), startsAt: text("starts_at"), endsAt: text("ends_at"),
  wagerRequirement: real("wager_requirement").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const promotionClaims = sqliteTable("promotion_claims", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), promotionId: text("promotion_id").notNull(), status: text("status").notNull(),
  wagerProgress: real("wager_progress").notNull().default(0), claimedAt: text("claimed_at").notNull(),
}, (table) => [uniqueIndex("promotion_claims_user_promotion_idx").on(table.userId, table.promotionId), index("promotion_claims_user_idx").on(table.userId, table.claimedAt)]);
export const gameActivity = sqliteTable("game_activity", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), gameId: text("game_id").notNull(), gameAccountId: text("game_account_id"),
  eventType: text("event_type").notNull(), result: text("result"), amount: real("amount").notNull().default(0), sessionReference: text("session_reference"), createdAt: text("created_at").notNull(),
}, (table) => [index("game_activity_user_created_idx").on(table.userId, table.createdAt)]);
export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), subject: text("subject").notNull(), category: text("category").notNull(),
  priority: text("priority").notNull().default("normal"), status: text("status").notNull().default("open"), assignedTo: text("assigned_to"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("support_tickets_status_idx").on(table.status, table.updatedAt)]);
export const cmsPages = sqliteTable("cms_pages", {
  slug: text("slug").primaryKey(), title: text("title").notNull(), body: text("body").notNull(), status: text("status").notNull(), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});
export const promotionalBanners = sqliteTable("promotional_banners", {
  id: text("id").primaryKey(), title: text("title").notNull(), message: text("message").notNull(), ctaLabel: text("cta_label"), ctaUrl: text("cta_url"), imageUrl: text("image_url"),
  status: text("status").notNull(), startsAt: text("starts_at"), endsAt: text("ends_at"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const paymentMethodConfigs = sqliteTable("payment_method_configs", {
  id: text("id").primaryKey(), name: text("name").notNull().unique(), methodType: text("method_type").notNull(), network: text("network"), instructions: text("instructions"),
  destination: text("destination"), enabled: integer("enabled", { mode: "boolean" }).notNull().default(true), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});
export const paymentMethodLinks = sqliteTable("payment_method_links", {
  methodId: text("method_id").primaryKey(), paymentUrl: text("payment_url"), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});
export const supportChannelConfigs = sqliteTable("support_channel_configs", {
  id: text("id").primaryKey(), label: text("label").notNull(), channelType: text("channel_type").notNull(), destination: text("destination"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false), updatedBy: text("updated_by"), updatedAt: text("updated_at").notNull(),
});
export const fraudAlerts = sqliteTable("fraud_alerts", {
  id: text("id").primaryKey(), userId: text("user_id"), alertType: text("alert_type").notNull(), severity: text("severity").notNull(), status: text("status").notNull(),
  description: text("description").notNull(), reviewedBy: text("reviewed_by"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("fraud_alerts_status_idx").on(table.status, table.createdAt)]);
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), actorId: text("actor_id").notNull(), action: text("action").notNull(), entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(), metadata: text("metadata"), createdAt: text("created_at").notNull(),
});
