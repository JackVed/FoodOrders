CREATE TYPE "public"."menu_item_type" AS ENUM('fixed', 'composable');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('Sent', 'Printed');--> statement-breakpoint
CREATE TYPE "public"."pricing_strategy" AS ENUM('sum_options', 'any_selected', 'first_and_additional', 'per_selected');--> statement-breakpoint
CREATE TYPE "public"."printer_transport_type" AS ENUM('mock', 'network', 'system');--> statement-breakpoint
CREATE TYPE "public"."source_app" AS ENUM('POS', 'Tableside');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'management', 'operator');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'operator' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_areas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kitchen_areas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kitchen_area_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_option_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_item_option_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"menu_item_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"pricing_strategy" "pricing_strategy" DEFAULT 'sum_options' NOT NULL,
	"first_selected_delta_cents" integer,
	"additional_selected_delta_cents" integer,
	"any_selected_delta_cents" integer,
	"per_selected_delta_cents" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_item_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"option_group_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"default_delta_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"kitchen_area_id" integer,
	"name" text NOT NULL,
	"item_type" "menu_item_type" DEFAULT 'fixed' NOT NULL,
	"base_price_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "printers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "printers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kitchen_area_id" integer NOT NULL,
	"name" text NOT NULL,
	"transport_type" "printer_transport_type" DEFAULT 'mock' NOT NULL,
	"connection_config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_ticket_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kitchen_ticket_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kitchen_ticket_id" integer NOT NULL,
	"order_item_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"kitchen_area_id" integer NOT NULL,
	"display_name_snapshot" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_tickets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kitchen_tickets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"kitchen_area_id" integer NOT NULL,
	"printer_id" integer,
	"inserted_by_username_snapshot" text NOT NULL,
	"source_app" "source_app" NOT NULL,
	"table_number" integer NOT NULL,
	"status" "order_status" DEFAULT 'Sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"printed_at" timestamp with time zone,
	"payload_json" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "order_item_selections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_item_selections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_item_id" integer NOT NULL,
	"option_group_name_snapshot" text NOT NULL,
	"option_name_snapshot" text NOT NULL,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"menu_item_id" integer,
	"kitchen_area_id" integer NOT NULL,
	"display_name_snapshot" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_by_user_id" integer NOT NULL,
	"created_by_username_snapshot" text NOT NULL,
	"source_app" "source_app" NOT NULL,
	"table_number" integer NOT NULL,
	"status" "order_status" DEFAULT 'Sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"printed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_delivery_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_delivery_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kitchen_ticket_id" integer NOT NULL,
	"printer_id" integer,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"raw_response_json" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "printers_id_kitchen_area_key" ON "printers" USING btree ("id","kitchen_area_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kitchen_tickets_id_order_kitchen_area_key" ON "kitchen_tickets" USING btree ("id","order_id","kitchen_area_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_id_order_kitchen_area_key" ON "order_items" USING btree ("id","order_id","kitchen_area_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_kitchen_area_id_kitchen_areas_id_fk" FOREIGN KEY ("kitchen_area_id") REFERENCES "public"."kitchen_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_options" ADD CONSTRAINT "menu_item_options_option_group_id_menu_item_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."menu_item_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_kitchen_area_id_kitchen_areas_id_fk" FOREIGN KEY ("kitchen_area_id") REFERENCES "public"."kitchen_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printers" ADD CONSTRAINT "printers_kitchen_area_id_kitchen_areas_id_fk" FOREIGN KEY ("kitchen_area_id") REFERENCES "public"."kitchen_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_ticket_items" ADD CONSTRAINT "kitchen_ticket_items_ticket_order_area_fk" FOREIGN KEY ("kitchen_ticket_id","order_id","kitchen_area_id") REFERENCES "public"."kitchen_tickets"("id","order_id","kitchen_area_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_ticket_items" ADD CONSTRAINT "kitchen_ticket_items_order_item_order_area_fk" FOREIGN KEY ("order_item_id","order_id","kitchen_area_id") REFERENCES "public"."order_items"("id","order_id","kitchen_area_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_kitchen_area_id_kitchen_areas_id_fk" FOREIGN KEY ("kitchen_area_id") REFERENCES "public"."kitchen_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_printer_id_printers_id_fk" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_printer_area_fk" FOREIGN KEY ("printer_id","kitchen_area_id") REFERENCES "public"."printers"("id","kitchen_area_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_selections" ADD CONSTRAINT "order_item_selections_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_kitchen_area_id_kitchen_areas_id_fk" FOREIGN KEY ("kitchen_area_id") REFERENCES "public"."kitchen_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_delivery_attempts" ADD CONSTRAINT "ticket_delivery_attempts_kitchen_ticket_id_kitchen_tickets_id_fk" FOREIGN KEY ("kitchen_ticket_id") REFERENCES "public"."kitchen_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_delivery_attempts" ADD CONSTRAINT "ticket_delivery_attempts_printer_id_printers_id_fk" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_session_token_hash_key" ON "sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_is_enabled_idx" ON "users" USING btree ("is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "kitchen_areas_name_key" ON "kitchen_areas" USING btree ("name");--> statement-breakpoint
CREATE INDEX "kitchen_areas_is_active_idx" ON "kitchen_areas" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_categories_kitchen_area_name_key" ON "menu_categories" USING btree ("kitchen_area_id","name");--> statement-breakpoint
CREATE INDEX "menu_categories_kitchen_area_id_idx" ON "menu_categories" USING btree ("kitchen_area_id");--> statement-breakpoint
CREATE INDEX "menu_categories_is_active_idx" ON "menu_categories" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_option_groups_item_code_key" ON "menu_item_option_groups" USING btree ("menu_item_id","code");--> statement-breakpoint
CREATE INDEX "menu_item_option_groups_menu_item_id_idx" ON "menu_item_option_groups" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_item_option_groups_is_active_idx" ON "menu_item_option_groups" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_options_group_code_key" ON "menu_item_options" USING btree ("option_group_id","code");--> statement-breakpoint
CREATE INDEX "menu_item_options_option_group_id_idx" ON "menu_item_options" USING btree ("option_group_id");--> statement-breakpoint
CREATE INDEX "menu_item_options_is_active_idx" ON "menu_item_options" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_items_category_name_key" ON "menu_items" USING btree ("category_id","name");--> statement-breakpoint
CREATE INDEX "menu_items_category_id_idx" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "menu_items_kitchen_area_id_idx" ON "menu_items" USING btree ("kitchen_area_id");--> statement-breakpoint
CREATE INDEX "menu_items_is_active_idx" ON "menu_items" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "printers_name_key" ON "printers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "printers_kitchen_area_id_idx" ON "printers" USING btree ("kitchen_area_id");--> statement-breakpoint
CREATE INDEX "printers_is_enabled_idx" ON "printers" USING btree ("is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "kitchen_ticket_items_ticket_order_item_key" ON "kitchen_ticket_items" USING btree ("kitchen_ticket_id","order_item_id");--> statement-breakpoint
CREATE INDEX "kitchen_ticket_items_kitchen_ticket_id_idx" ON "kitchen_ticket_items" USING btree ("kitchen_ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kitchen_tickets_order_kitchen_area_key" ON "kitchen_tickets" USING btree ("order_id","kitchen_area_id");--> statement-breakpoint
CREATE INDEX "kitchen_tickets_status_idx" ON "kitchen_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kitchen_tickets_kitchen_area_id_idx" ON "kitchen_tickets" USING btree ("kitchen_area_id");--> statement-breakpoint
CREATE INDEX "kitchen_tickets_created_at_idx" ON "kitchen_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_item_selections_order_item_id_idx" ON "order_item_selections" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_kitchen_area_id_idx" ON "order_items" USING btree ("kitchen_area_id");--> statement-breakpoint
CREATE INDEX "orders_created_by_user_id_idx" ON "orders" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ticket_delivery_attempts_kitchen_ticket_id_idx" ON "ticket_delivery_attempts" USING btree ("kitchen_ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_delivery_attempts_success_idx" ON "ticket_delivery_attempts" USING btree ("success");--> statement-breakpoint
CREATE INDEX "ticket_delivery_attempts_attempted_at_idx" ON "ticket_delivery_attempts" USING btree ("attempted_at");