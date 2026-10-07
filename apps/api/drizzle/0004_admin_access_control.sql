CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_logs_action_valid" CHECK (length("admin_audit_logs"."action") <= 80 and "admin_audit_logs"."action" ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$'),
	CONSTRAINT "admin_audit_logs_target_pair_valid" CHECK (("admin_audit_logs"."target_type" is null) = ("admin_audit_logs"."target_id" is null)),
	CONSTRAINT "admin_audit_logs_target_type_valid" CHECK ("admin_audit_logs"."target_type" is null or (length("admin_audit_logs"."target_type") <= 64 and "admin_audit_logs"."target_type" ~ '^[a-z][a-z0-9_]*$')),
	CONSTRAINT "admin_audit_logs_target_id_valid" CHECK ("admin_audit_logs"."target_id" is null or length(btrim("admin_audit_logs"."target_id")) between 1 and 128),
	CONSTRAINT "admin_audit_logs_metadata_valid" CHECK (jsonb_typeof("admin_audit_logs"."metadata") = 'object' and octet_length("admin_audit_logs"."metadata"::text) <= 16384)
);
--> statement-breakpoint
CREATE TABLE "admin_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admin_invitations_token_hash_valid" CHECK ("admin_invitations"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "admin_invitations_not_self" CHECK ("admin_invitations"."user_id" != "admin_invitations"."invited_by"),
	CONSTRAINT "admin_invitations_expiry_valid" CHECK ("admin_invitations"."expires_at" > "admin_invitations"."created_at"),
	CONSTRAINT "admin_invitations_terminal_state_valid" CHECK ("admin_invitations"."accepted_at" is null or "admin_invitations"."revoked_at" is null),
	CONSTRAINT "admin_invitations_acceptance_valid" CHECK ("admin_invitations"."accepted_at" is null or ("admin_invitations"."accepted_at" >= "admin_invitations"."created_at" and "admin_invitations"."accepted_at" < "admin_invitations"."expires_at")),
	CONSTRAINT "admin_invitations_revocation_valid" CHECK ("admin_invitations"."revoked_at" is null or "admin_invitations"."revoked_at" >= "admin_invitations"."created_at")
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admin_sessions_token_hash_valid" CHECK ("admin_sessions"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "admin_sessions_auth_version_valid" CHECK ("admin_sessions"."auth_version" > 0),
	CONSTRAINT "admin_sessions_expiry_valid" CHECK ("admin_sessions"."expires_at" > "admin_sessions"."created_at"),
	CONSTRAINT "admin_sessions_last_seen_valid" CHECK ("admin_sessions"."last_seen_at" is null or "admin_sessions"."last_seen_at" >= "admin_sessions"."created_at"),
	CONSTRAINT "admin_sessions_revocation_valid" CHECK ("admin_sessions"."revoked_at" is null or "admin_sessions"."revoked_at" >= "admin_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" text DEFAULT 'editor' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"auth_version" integer DEFAULT 1 NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_valid" CHECK ("admin_users"."email" = lower(btrim("admin_users"."email")) and length("admin_users"."email") between 3 and 254 and "admin_users"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
	CONSTRAINT "admin_users_name_valid" CHECK (length(btrim("admin_users"."name")) between 1 and 120),
	CONSTRAINT "admin_users_role_valid" CHECK ("admin_users"."role" in ('owner', 'admin', 'editor')),
	CONSTRAINT "admin_users_status_valid" CHECK ("admin_users"."status" in ('invited', 'active', 'disabled')),
	CONSTRAINT "admin_users_auth_version_valid" CHECK ("admin_users"."auth_version" > 0),
	CONSTRAINT "admin_users_password_hash_valid" CHECK ("admin_users"."password_hash" is null or "admin_users"."password_hash" ~ '^scrypt[$][a-f0-9]{32}[$][a-f0-9]{128}$'),
	CONSTRAINT "admin_users_active_credentials_ready" CHECK ("admin_users"."status" != 'active' or ("admin_users"."password_hash" is not null and "admin_users"."password_changed_at" is not null)),
	CONSTRAINT "admin_users_invited_credentials_empty" CHECK ("admin_users"."status" != 'invited' or ("admin_users"."password_hash" is null and "admin_users"."password_changed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_admin_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_created_idx" ON "admin_audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_created_idx" ON "admin_audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invitations_token_hash_unique" ON "admin_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invitations_pending_user_unique" ON "admin_invitations" USING btree ("user_id") WHERE "admin_invitations"."accepted_at" is null and "admin_invitations"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "admin_invitations_invited_by_idx" ON "admin_invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "admin_invitations_expires_at_idx" ON "admin_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_unique" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_users_status_role_idx" ON "admin_users" USING btree ("status","role");