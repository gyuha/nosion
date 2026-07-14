CREATE TABLE "db_property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_value" (
	"row_page_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"value" jsonb,
	CONSTRAINT "property_value_row_page_id_property_id_pk" PRIMARY KEY("row_page_id","property_id")
);
--> statement-breakpoint
ALTER TABLE "db_property" ADD CONSTRAINT "db_property_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_value" ADD CONSTRAINT "property_value_row_page_id_page_id_fk" FOREIGN KEY ("row_page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_value" ADD CONSTRAINT "property_value_property_id_db_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."db_property"("id") ON DELETE cascade ON UPDATE no action;