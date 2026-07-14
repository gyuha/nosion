CREATE TABLE "page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" uuid,
	"type" text NOT NULL,
	"title" text DEFAULT '제목 없음' NOT NULL,
	"icon" text,
	"cover" text,
	"is_row" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_parent_id_page_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;