CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`username` text NOT NULL,
	`encrypted_password` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`accent` text NOT NULL,
	`api_status` text DEFAULT 'awaiting_credentials' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text NOT NULL,
	`referred_email` text NOT NULL,
	`status` text NOT NULL,
	`reward` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`channel` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text NOT NULL,
	`provider` text,
	`game_id` text,
	`proof_key` text,
	`description` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`amount` real NOT NULL,
	`note` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`player_tag` text NOT NULL,
	`role` text DEFAULT 'player' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`referral_code` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_player_tag_unique` ON `users` (`player_tag`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_referral_code_unique` ON `users` (`referral_code`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`cash_balance` real DEFAULT 0 NOT NULL,
	`freeplay_balance` real DEFAULT 0 NOT NULL,
	`referral_balance` real DEFAULT 0 NOT NULL,
	`reserved_balance` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text NOT NULL,
	`destination_masked` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
