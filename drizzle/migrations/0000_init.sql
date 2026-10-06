CREATE TABLE `classrooms` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`age_range` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classrooms_org_name_unique` ON `classrooms` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`device_type` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`last_seen_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devices_org_idx` ON `devices` (`organization_id`);--> statement-breakpoint
CREATE TABLE `organization_branding` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`logo_url` text,
	`favicon_url` text,
	`primary_color` text DEFAULT '#2f6bea' NOT NULL,
	`secondary_color` text DEFAULT '#7c4dff' NOT NULL,
	`accent_color` text DEFAULT '#f28c28' NOT NULL,
	`kiosk_welcome_message` text DEFAULT 'Welcome!' NOT NULL,
	`receipt_business_name` text,
	`receipt_tax_id` text,
	`receipt_prefix` text DEFAULT 'RC' NOT NULL,
	`receipt_footer` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_branding_org_unique` ON `organization_branding` (`organization_id`);--> statement-breakpoint
CREATE TABLE `organization_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_memberships_org_user_unique` ON `organization_memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `organization_memberships_user_idx` ON `organization_memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`legal_name` text,
	`tagline` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`expected_arrival_by` text DEFAULT '08:30' NOT NULL,
	`address_line_1` text,
	`address_line_2` text,
	`city` text,
	`state_region` text,
	`postal_code` text,
	`country` text,
	`phone` text,
	`email` text,
	`website` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_provider_id` text NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_provider_id_unique` ON `users` (`auth_provider_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `child_guardians` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`child_id` text NOT NULL,
	`guardian_id` text NOT NULL,
	`relationship` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`authorized_pickup` integer DEFAULT true NOT NULL,
	`emergency_contact` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `child_guardians_child_guardian_unique` ON `child_guardians` (`child_id`,`guardian_id`);--> statement-breakpoint
CREATE INDEX `child_guardians_org_child_idx` ON `child_guardians` (`organization_id`,`child_id`);--> statement-breakpoint
CREATE INDEX `child_guardians_org_guardian_idx` ON `child_guardians` (`organization_id`,`guardian_id`);--> statement-breakpoint
CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`preferred_name` text,
	`date_of_birth` text NOT NULL,
	`classroom_id` text,
	`enrollment_status` text DEFAULT 'ACTIVE' NOT NULL,
	`enrollment_date` text,
	`photo_url` text,
	`medical_notes` text,
	`allergy_notes` text,
	`general_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `children_org_status_idx` ON `children` (`organization_id`,`enrollment_status`);--> statement-breakpoint
CREATE INDEX `children_org_name_idx` ON `children` (`organization_id`,`last_name`,`first_name`);--> statement-breakpoint
CREATE TABLE `guardians` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`alternate_phone` text,
	`address` text,
	`pin_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `guardians_org_name_idx` ON `guardians` (`organization_id`,`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `guardians_org_email_idx` ON `guardians` (`organization_id`,`email`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text,
	`employee_number` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`job_title` text NOT NULL,
	`classroom_id` text,
	`employment_status` text DEFAULT 'ACTIVE' NOT NULL,
	`status_note` text,
	`pin_hash` text,
	`hire_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `staff_org_status_idx` ON `staff` (`organization_id`,`employment_status`);--> statement-breakpoint
CREATE INDEX `staff_org_email_idx` ON `staff` (`organization_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_org_employee_number_unique` ON `staff` (`organization_id`,`employee_number`);--> statement-breakpoint
CREATE TABLE `attendance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`child_id` text NOT NULL,
	`guardian_id` text,
	`event_type` text NOT NULL,
	`event_time` integer NOT NULL,
	`device_id` text,
	`signature_object_key` text,
	`notes` text,
	`created_by_user_id` text,
	`client_event_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_events_org_client_event_unique` ON `attendance_events` (`organization_id`,`client_event_id`);--> statement-breakpoint
CREATE INDEX `attendance_events_org_child_time_idx` ON `attendance_events` (`organization_id`,`child_id`,`event_time`);--> statement-breakpoint
CREATE INDEX `attendance_events_org_time_idx` ON `attendance_events` (`organization_id`,`event_time`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_org_time_idx` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `staff_time_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_time` integer NOT NULL,
	`device_id` text,
	`created_by_user_id` text,
	`client_event_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_time_events_org_client_event_unique` ON `staff_time_events` (`organization_id`,`client_event_id`);--> statement-breakpoint
CREATE INDEX `staff_time_events_org_staff_time_idx` ON `staff_time_events` (`organization_id`,`staff_id`,`event_time`);--> statement-breakpoint
CREATE INDEX `staff_time_events_org_time_idx` ON `staff_time_events` (`organization_id`,`event_time`);