CREATE TABLE "email_optouts" (
	"email" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_optouts_email_lower_check" CHECK ("email_optouts"."email" = lower("email_optouts"."email"))
);

--> statement-breakpoint
ALTER TABLE "email_optouts" ENABLE ROW LEVEL SECURITY;
