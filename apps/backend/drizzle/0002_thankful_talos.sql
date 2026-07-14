CREATE TABLE "document" (
	"page_id" uuid PRIMARY KEY NOT NULL,
	"content" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_text" text
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;