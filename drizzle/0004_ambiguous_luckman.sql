CREATE TABLE `payment_proofs` (
	`proof_key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_proofs_user_created_idx` ON `payment_proofs` (`user_id`,`created_at`);