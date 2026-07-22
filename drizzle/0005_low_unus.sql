CREATE TABLE `auth_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`challenge_type` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_challenges_email_type_idx` ON `auth_challenges` (`email`,`challenge_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `cms_pages` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fraud_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`alert_type` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`description` text NOT NULL,
	`reviewed_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fraud_alerts_status_idx` ON `fraud_alerts` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `game_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`game_account_id` text,
	`event_type` text NOT NULL,
	`result` text,
	`amount` real DEFAULT 0 NOT NULL,
	`session_reference` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_activity_user_created_idx` ON `game_activity` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `game_launch_links` (
	`game_id` text PRIMARY KEY NOT NULL,
	`launch_url` text,
	`updated_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`event_type` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`device_id` text,
	`success` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_events_user_created_idx` ON `login_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`notification_type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`provider`, `provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`code_verifier` text NOT NULL,
	`nonce` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_method_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`method_type` text NOT NULL,
	`network` text,
	`instructions` text,
	`destination` text,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_configs_name_unique` ON `payment_method_configs` (`name`);--> statement-breakpoint
CREATE TABLE `profile_images` (
	`user_id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotion_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`promotion_id` text NOT NULL,
	`status` text NOT NULL,
	`wager_progress` real DEFAULT 0 NOT NULL,
	`claimed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotion_claims_user_promotion_idx` ON `promotion_claims` (`user_id`,`promotion_id`);--> statement-breakpoint
CREATE INDEX `promotion_claims_user_idx` ON `promotion_claims` (`user_id`,`claimed_at`);--> statement-breakpoint
CREATE TABLE `promotional_banners` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`cta_label` text,
	`cta_url` text,
	`image_url` text,
	`status` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`reward_type` text NOT NULL,
	`reward_amount` real DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`wager_requirement` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_code_unique` ON `promotions` (`code`);--> statement-breakpoint
CREATE TABLE `security_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`deposit_limit` real,
	`self_excluded_until` text,
	`suspension_requested` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject` text NOT NULL,
	`category` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_tickets_status_idx` ON `support_tickets` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `user_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`user_agent` text,
	`last_ip` text,
	`trusted` integer DEFAULT false NOT NULL,
	`last_seen_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `user_devices_user_seen_idx` ON `user_devices` (`user_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`avatar_url` text,
	`phone` text,
	`date_of_birth` text,
	`country` text,
	`region` text,
	`address` text,
	`age_confirmed` integer DEFAULT false NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`contact_preferences` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`verification_type` text NOT NULL,
	`status` text NOT NULL,
	`document_type` text,
	`reference` text,
	`note` text,
	`reviewed_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_requests_status_idx` ON `verification_requests` (`status`,`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_operation_links` (
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	PRIMARY KEY(`entity_type`, `entity_id`)
);
--> statement-breakpoint
INSERT INTO `__new_operation_links`("entity_type", "entity_id", "transaction_id") SELECT "entity_type", "entity_id", "transaction_id" FROM `operation_links`;--> statement-breakpoint
DROP TABLE `operation_links`;--> statement-breakpoint
ALTER TABLE `__new_operation_links` RENAME TO `operation_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;