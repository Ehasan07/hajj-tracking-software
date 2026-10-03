CREATE TYPE "public"."sale_status" AS ENUM('completed', 'void');--> statement-breakpoint
CREATE TYPE "public"."stock_reason" AS ENUM('purchase', 'sale', 'adjustment', 'return', 'void');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('tentative', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."hotel_city" AS ENUM('makkah', 'madinah', 'other');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('double', 'triple', 'quad', 'quint');--> statement-breakpoint
CREATE TYPE "public"."salary_sheet_status" AS ENUM('draft', 'locked', 'paid');--> statement-breakpoint
CREATE TABLE "customer_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"unit" "business_unit" NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BDT' NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_date" date NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"note" text,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	CONSTRAINT "customer_payments_amount" CHECK ("customer_payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "customer_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"unit" "business_unit" NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"area" text,
	"route_id" uuid,
	"opening_due" bigint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_opening_due" CHECK ("customers"."opening_due" >= 0)
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_no" text NOT NULL,
	"expires_on" date NOT NULL,
	"qty" integer NOT NULL,
	"cost" bigint,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_batches_qty" CHECK ("product_batches"."qty" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"unit" "business_unit" NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"category" text,
	"unit_label" text DEFAULT 'pcs' NOT NULL,
	"price" bigint NOT NULL,
	"cost" bigint,
	"track_stock" boolean DEFAULT true NOT NULL,
	"uses_batches" boolean DEFAULT false NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer,
	"generic_name" text,
	"strength" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price" CHECK ("products"."price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"unit" "business_unit" NOT NULL,
	"weekday" smallint NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_weekday" CHECK ("routes"."weekday" between 0 and 6)
);
--> statement-breakpoint
ALTER TABLE "routes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	"line_total" bigint NOT NULL,
	CONSTRAINT "sale_items_qty" CHECK ("sale_items"."qty" > 0 and "sale_items"."line_total" = "sale_items"."qty" * "sale_items"."unit_price")
);
--> statement-breakpoint
ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"unit" "business_unit" NOT NULL,
	"ref" text NOT NULL,
	"customer_id" uuid,
	"route_id" uuid,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_date" date NOT NULL,
	"subtotal" bigint NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"paid" bigint NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"note" text,
	"ledger_entry_id" uuid,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"void_ledger_entry_id" uuid,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_amounts" CHECK ("sales"."subtotal" >= 0 and "sales"."discount" >= 0 and "sales"."discount" <= "sales"."subtotal" and "sales"."total" = "sales"."subtotal" - "sales"."discount" and "sales"."paid" >= 0 and "sales"."paid" <= "sales"."total"),
	CONSTRAINT "sales_credit_needs_customer" CHECK ("sales"."paid" = "sales"."total" or "sales"."customer_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"qty" integer NOT NULL,
	"reason" "stock_reason" NOT NULL,
	"sale_id" uuid,
	"note" text,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_nonzero" CHECK ("stock_movements"."qty" <> 0)
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employee_advances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"given_on" date NOT NULL,
	"method" "payment_method" NOT NULL,
	"note" text,
	"ledger_entry_id" uuid NOT NULL,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_advances_amount" CHECK ("employee_advances"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "employee_advances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"name" text NOT NULL,
	"designation" text,
	"phone" text,
	"joined_on" date,
	"basic" bigint NOT NULL,
	"allowances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payout_method" text,
	"account_no" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_basic" CHECK ("employees"."basic" >= 0)
);
--> statement-breakpoint
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"unit" "business_unit" NOT NULL,
	"category" text NOT NULL,
	"payee" text,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BDT' NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"spent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_date" date NOT NULL,
	"note" text,
	"hotel_booking_id" uuid,
	"ledger_entry_id" uuid NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"void_ledger_entry_id" uuid,
	"created_by" text DEFAULT current_setting('app.user_id', true) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hotel_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"ref" text NOT NULL,
	"hotel_id" uuid NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"room_type" "room_type" NOT NULL,
	"rooms" integer NOT NULL,
	"rate" bigint NOT NULL,
	"currency" "currency" DEFAULT 'SAR' NOT NULL,
	"total" bigint NOT NULL,
	"supplier" text,
	"status" "booking_status" DEFAULT 'tentative' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_bookings_dates" CHECK ("hotel_bookings"."check_out" > "hotel_bookings"."check_in"),
	CONSTRAINT "hotel_bookings_rooms" CHECK ("hotel_bookings"."rooms" > 0 and "hotel_bookings"."rate" >= 0 and "hotel_bookings"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "hotel_bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"name" text NOT NULL,
	"city" "hotel_city" NOT NULL,
	"address" text,
	"distance" text,
	"phone" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_units" (
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"user_id" text NOT NULL,
	"units" "business_unit"[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "room_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"booking_id" uuid NOT NULL,
	"room_no" text NOT NULL,
	"pilgrim_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "salary_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"sheet_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"basic" bigint NOT NULL,
	"allowances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deductions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unpaid_absent_days" integer DEFAULT 0 NOT NULL,
	"overtime_hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"overtime_rate" bigint DEFAULT 0 NOT NULL,
	"advance_recovery" bigint DEFAULT 0 NOT NULL,
	"gross" bigint NOT NULL,
	"total_deductions" bigint NOT NULL,
	"net" bigint NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "salary_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "salary_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text DEFAULT current_setting('app.tenant_id', true) NOT NULL,
	"month" text NOT NULL,
	"working_days" integer DEFAULT 26 NOT NULL,
	"status" "salary_sheet_status" DEFAULT 'draft' NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"paid_at" timestamp with time zone,
	"ledger_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salary_sheets_month" CHECK ("salary_sheets"."month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "salary_sheets_days" CHECK ("salary_sheets"."working_days" between 1 and 31)
);
--> statement-breakpoint
ALTER TABLE "salary_sheets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_units" ADD CONSTRAINT "member_units_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_booking_id_hotel_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."hotel_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_pilgrim_id_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."pilgrims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_lines" ADD CONSTRAINT "salary_lines_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_lines" ADD CONSTRAINT "salary_lines_sheet_id_salary_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."salary_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_lines" ADD CONSTRAINT "salary_lines_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_sheets" ADD CONSTRAINT "salary_sheets_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_payments_customer_idx" ON "customer_payments" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "customers_unit_idx" ON "customers" USING btree ("tenant_id","unit","route_id");--> statement-breakpoint
CREATE INDEX "product_batches_fefo_idx" ON "product_batches" USING btree ("tenant_id","product_id","expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX "products_code_idx" ON "products" USING btree ("tenant_id","unit","code");--> statement-breakpoint
CREATE INDEX "products_unit_idx" ON "products" USING btree ("tenant_id","unit","active");--> statement-breakpoint
CREATE INDEX "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "routes_weekday_idx" ON "routes" USING btree ("tenant_id","unit","weekday");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("tenant_id","sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_ref_idx" ON "sales" USING btree ("tenant_id","ref");--> statement-breakpoint
CREATE INDEX "sales_day_idx" ON "sales" USING btree ("tenant_id","unit","business_date");--> statement-breakpoint
CREATE INDEX "sales_customer_idx" ON "sales" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("tenant_id","product_id","created_at");--> statement-breakpoint
CREATE INDEX "expenses_day_idx" ON "expenses" USING btree ("tenant_id","business_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hotel_bookings_ref_idx" ON "hotel_bookings" USING btree ("tenant_id","ref");--> statement-breakpoint
CREATE UNIQUE INDEX "member_units_user_idx" ON "member_units" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_assignments_pilgrim_idx" ON "room_assignments" USING btree ("booking_id","pilgrim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_lines_employee_idx" ON "salary_lines" USING btree ("sheet_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_sheets_month_idx" ON "salary_sheets" USING btree ("tenant_id","month");--> statement-breakpoint
CREATE POLICY "customer_payments_tenant_isolation" ON "customer_payments" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "customers_tenant_isolation" ON "customers" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "product_batches_tenant_isolation" ON "product_batches" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "products_tenant_isolation" ON "products" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "routes_tenant_isolation" ON "routes" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "sale_items_tenant_isolation" ON "sale_items" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "sales_tenant_isolation" ON "sales" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "stock_movements_tenant_isolation" ON "stock_movements" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "employee_advances_tenant_isolation" ON "employee_advances" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "employees_tenant_isolation" ON "employees" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "expenses_tenant_isolation" ON "expenses" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "hotel_bookings_tenant_isolation" ON "hotel_bookings" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "hotels_tenant_isolation" ON "hotels" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "member_units_tenant_isolation" ON "member_units" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "room_assignments_tenant_isolation" ON "room_assignments" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "salary_lines_tenant_isolation" ON "salary_lines" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));--> statement-breakpoint
CREATE POLICY "salary_sheets_tenant_isolation" ON "salary_sheets" AS PERMISSIVE FOR ALL TO "hajj_app" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));