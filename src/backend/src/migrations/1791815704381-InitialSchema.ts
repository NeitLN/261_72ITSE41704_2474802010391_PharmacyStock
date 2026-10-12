import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791815704381 implements MigrationInterface {
  name = 'InitialSchema1791815704381';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "username" character varying NOT NULL, "passwordHash" character varying NOT NULL, "fullName" character varying NOT NULL, "email" character varying, "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "role_id" uuid NOT NULL, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_type_enum" AS ENUM('receipt', 'dispense', 'sale', 'return', 'release', 'reject', 'write_off', 'destroy', 'adjustment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_sourcedocumenttype_enum" AS ENUM('goods_receipt', 'dispense_line', 'sale_line', 'return_line', 'stock_take_line', 'batch')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "public"."stock_movements_type_enum" NOT NULL, "deltaSellable" integer NOT NULL DEFAULT '0', "deltaQuarantine" integer NOT NULL DEFAULT '0', "deltaPendingDestruction" integer NOT NULL DEFAULT '0', "reason" character varying, "sourceDocumentType" "public"."stock_movements_sourcedocumenttype_enum" NOT NULL, "sourceDocumentId" uuid NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reverses_movement_id" uuid, "batch_id" uuid NOT NULL, "performed_by_id" uuid NOT NULL, CONSTRAINT "REL_289c20ebaf1d40f7f035f9a501" UNIQUE ("reverses_movement_id"), CONSTRAINT "ck_stock_movements_not_empty" CHECK ("deltaSellable" <> 0 OR "deltaQuarantine" <> 0 OR "deltaPendingDestruction" <> 0), CONSTRAINT "ck_stock_movements_sign_by_type" CHECK ("reverses_movement_id" IS NOT NULL OR ("type" = 'receipt' AND "deltaSellable" > 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0) OR ("type" IN ('dispense', 'sale') AND "deltaSellable" < 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0) OR ("type" = 'return' AND "deltaSellable" = 0 AND "deltaQuarantine" > 0 AND "deltaPendingDestruction" = 0) OR ("type" = 'release' AND "deltaQuarantine" < 0 AND "deltaSellable" = -"deltaQuarantine" AND "deltaPendingDestruction" = 0) OR ("type" = 'reject' AND "deltaQuarantine" < 0 AND "deltaPendingDestruction" = -"deltaQuarantine" AND "deltaSellable" = 0) OR ("type" = 'write_off' AND "deltaSellable" < 0 AND "deltaPendingDestruction" = -"deltaSellable" AND "deltaQuarantine" = 0) OR ("type" = 'destroy' AND "deltaSellable" = 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" < 0) OR ("type" = 'adjustment' AND "deltaSellable" <> 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0)), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_stock_movements_batch_occurred" ON "stock_movements"  ("batch_id", "occurredAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."batches_status_enum" AS ENUM('active', 'on_hold', 'recalled', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "batches" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "batchNumber" character varying NOT NULL, "expiryDate" date NOT NULL, "qtySellable" integer NOT NULL DEFAULT '0', "qtyQuarantine" integer NOT NULL DEFAULT '0', "qtyPendingDestruction" integer NOT NULL DEFAULT '0', "status" "public"."batches_status_enum" NOT NULL DEFAULT 'active', "statusReason" character varying, "statusChangedAt" TIMESTAMP WITH TIME ZONE, "unitCost" numeric(12,2) NOT NULL, "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status_changed_by_id" uuid, "medicine_id" uuid NOT NULL, CONSTRAINT "uq_batch_medicine_number" UNIQUE ("medicine_id", "batchNumber"), CONSTRAINT "ck_batches_qty_pending_destruction" CHECK ("qtyPendingDestruction" >= 0), CONSTRAINT "ck_batches_qty_quarantine" CHECK ("qtyQuarantine" >= 0), CONSTRAINT "ck_batches_qty_sellable" CHECK ("qtySellable" >= 0), CONSTRAINT "PK_55e7ff646e969b61d37eea5be7a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medicine_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_059877cb9b501151195d93517df" UNIQUE ("code"), CONSTRAINT "PK_65570b2a887d4973deb8a139b35" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "units_of_measure" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "name" character varying NOT NULL, "conversionToBase" integer NOT NULL DEFAULT '1', "isBaseUnit" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_7a83359bddb3d311a7556e572d6" UNIQUE ("code"), CONSTRAINT "PK_ce93a9c86be10704b5415ca4bee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medicine_prices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "unitPrice" numeric(12,2) NOT NULL, "effectiveFrom" date NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "medicine_id" uuid NOT NULL, "set_by_id" uuid NOT NULL, CONSTRAINT "uq_medicine_price_effective_from" UNIQUE ("medicine_id", "effectiveFrom"), CONSTRAINT "ck_medicine_prices_positive" CHECK ("unitPrice" > 0), CONSTRAINT "PK_4fa7d6ea0a5d3c9fd788ed5aa3f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."medicines_classification_enum" AS ENUM('otc', 'prescription', 'controlled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "medicines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "name" character varying NOT NULL, "activeIngredient" character varying, "strength" character varying, "classification" "public"."medicines_classification_enum" NOT NULL DEFAULT 'prescription', "classificationSource" character varying, "classificationDate" date, "reorderLevel" integer NOT NULL DEFAULT '0', "lowStockMonitored" boolean NOT NULL DEFAULT true, "expiryAlertDays" integer NOT NULL DEFAULT '90', "isActive" boolean NOT NULL DEFAULT true, "category_id" uuid NOT NULL, "base_unit_id" uuid NOT NULL, CONSTRAINT "UQ_c4c9ac38aba0468688754ec2036" UNIQUE ("code"), CONSTRAINT "ck_medicines_expiry_alert_days" CHECK ("expiryAlertDays" >= 0), CONSTRAINT "ck_medicines_reorder_level" CHECK ("reorderLevel" >= 0), CONSTRAINT "PK_77b93851766f7ab93f71f44b18b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "goods_receipt_lines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "lineNumber" integer NOT NULL, "quantity" integer NOT NULL, "unitCost" numeric(12,2) NOT NULL, "goods_receipt_id" uuid NOT NULL, "medicine_id" uuid NOT NULL, "batch_id" uuid NOT NULL, CONSTRAINT "ck_goods_receipt_lines_unit_cost" CHECK ("unitCost" >= 0), CONSTRAINT "ck_goods_receipt_lines_quantity" CHECK ("quantity" > 0), CONSTRAINT "PK_7085a869c816a8e59e460783268" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "goods_receipts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "documentNumber" character varying NOT NULL, "receiptDate" date NOT NULL, "totalCost" numeric(14,2) NOT NULL DEFAULT '0', "note" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "supplier_id" uuid NOT NULL, "received_by_id" uuid NOT NULL, CONSTRAINT "uq_goods_receipt_supplier_document" UNIQUE ("supplier_id", "documentNumber"), CONSTRAINT "PK_f8cac411be0211f923e1be8534f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "suppliers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "phone" character varying NOT NULL, "address" character varying, "contactPerson" character varying, "email" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sale_returns" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "referenceNumber" character varying NOT NULL, "reason" character varying NOT NULL, "refundAmount" numeric(12,2) NOT NULL DEFAULT '0', "returnedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sale_id" uuid NOT NULL, "processed_by_id" uuid NOT NULL, CONSTRAINT "UQ_eed5a5b2b09a68a1a022faf3133" UNIQUE ("referenceNumber"), CONSTRAINT "PK_0dacb97f81ef1ca47f61409f844" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."return_lines_assessmentstatus_enum" AS ENUM('pending_assessment', 'released', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "return_lines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quantity" integer NOT NULL, "unitPrice" numeric(12,2) NOT NULL, "assessmentStatus" "public"."return_lines_assessmentstatus_enum" NOT NULL DEFAULT 'pending_assessment', "assessedAt" TIMESTAMP WITH TIME ZONE, "assessmentNote" character varying, "assessed_by_id" uuid, "sale_return_id" uuid NOT NULL, "sale_line_id" uuid NOT NULL, CONSTRAINT "ck_return_lines_quantity" CHECK ("quantity" > 0), CONSTRAINT "PK_d07139763a47ebef84eea8df1d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sale_lines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quantity" integer NOT NULL, "quantityReturned" integer NOT NULL DEFAULT '0', "unitPrice" numeric(12,2) NOT NULL, "lineTotal" numeric(12,2) NOT NULL, "sale_id" uuid NOT NULL, "batch_id" uuid NOT NULL, CONSTRAINT "ck_sale_lines_returned" CHECK ("quantityReturned" >= 0 AND "quantityReturned" <= "quantity"), CONSTRAINT "ck_sale_lines_quantity" CHECK ("quantity" > 0), CONSTRAINT "PK_d3e4396511029d8a97d9e946fb1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "prescription_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quantityPrescribed" integer NOT NULL, "quantityDispensed" integer NOT NULL DEFAULT '0', "strength" character varying NOT NULL, "dose" character varying NOT NULL, "route" character varying NOT NULL, "daysOfUse" integer NOT NULL, "prescription_id" uuid NOT NULL, "medicine_id" uuid NOT NULL, CONSTRAINT "ck_prescription_items_dispensed" CHECK ("quantityDispensed" >= 0 AND "quantityDispensed" <= "quantityPrescribed"), CONSTRAINT "ck_prescription_items_quantity" CHECK ("quantityPrescribed" > 0), CONSTRAINT "PK_6216831f49afc381b3934c9672c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "prescribers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "licenceNumber" character varying NOT NULL, "fullName" character varying NOT NULL, "clinicName" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_f485762995f7c5af1f96f2e4d36" UNIQUE ("licenceNumber"), CONSTRAINT "PK_10eaff7eaf75f64308965cf10ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prescriptions_status_enum" AS ENUM('received', 'verified', 'partially_dispensed', 'fully_dispensed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prescriptions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "referenceNumber" character varying NOT NULL, "issuedDate" date NOT NULL, "validUntil" date NOT NULL, "status" "public"."prescriptions_status_enum" NOT NULL DEFAULT 'received', "patientAgeYears" integer, "patientAgeMonths" integer, "patientWeightKg" numeric(5,2), "accompanyingAdult" character varying, "verifiedAt" TIMESTAMP WITH TIME ZONE, "verificationNote" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "verified_by_id" uuid, "customer_id" uuid NOT NULL, "prescriber_id" uuid NOT NULL, CONSTRAINT "UQ_c0e8da1280cff3708a2eeedde52" UNIQUE ("referenceNumber"), CONSTRAINT "ck_prescriptions_valid_until" CHECK ("validUntil" >= "issuedDate"), CONSTRAINT "PK_097b2cc2f2b7e56825468188503" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "dispense_lines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quantity" integer NOT NULL, "partialSupplyNote" character varying, "dispensedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "prescription_id" uuid NOT NULL, "prescription_item_id" uuid NOT NULL, "batch_id" uuid NOT NULL, "sale_id" uuid, "dispensed_by_id" uuid NOT NULL, CONSTRAINT "ck_dispense_lines_quantity" CHECK ("quantity" > 0), CONSTRAINT "PK_3d1e26619798ae53287015cb82d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_status_enum" AS ENUM('completed', 'partially_returned', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "receiptNumber" character varying NOT NULL, "totalAmount" numeric(12,2) NOT NULL DEFAULT '0', "status" "public"."sales_status_enum" NOT NULL DEFAULT 'completed', "soldAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "customer_id" uuid, "sold_by_id" uuid NOT NULL, CONSTRAINT "UQ_ef2ed422714fc1a45156087ee8b" UNIQUE ("receiptNumber"), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "fullName" character varying NOT NULL, "phone" character varying, "dateOfBirth" date, "address" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f2eee14aa1fe3e956fe193c142f" UNIQUE ("code"), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_take_lines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "systemQuantity" integer NOT NULL, "countedQuantity" integer, "reason" character varying, "stock_take_id" uuid NOT NULL, "batch_id" uuid NOT NULL, CONSTRAINT "ck_stock_take_lines_counted_qty" CHECK ("countedQuantity" IS NULL OR "countedQuantity" >= 0), CONSTRAINT "ck_stock_take_lines_system_qty" CHECK ("systemQuantity" >= 0), CONSTRAINT "PK_1bc52b84a45b65e016da24f21a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_takes_status_enum" AS ENUM('counting', 'pending_approval', 'approved', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_takes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "referenceNumber" character varying NOT NULL, "status" "public"."stock_takes_status_enum" NOT NULL DEFAULT 'counting', "note" character varying, "submittedAt" TIMESTAMP WITH TIME ZONE, "approvedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "opened_by_id" uuid NOT NULL, "counted_by_id" uuid, "approved_by_id" uuid, CONSTRAINT "UQ_7606396abbb2e3821c85db1b57a" UNIQUE ("referenceNumber"), CONSTRAINT "PK_afd37c89465f9b9caae8bad71a9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_alerts_type_enum" AS ENUM('low_stock', 'out_of_stock', 'expiring_soon', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_alerts_status_enum" AS ENUM('open', 'acknowledged', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_alerts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "public"."stock_alerts_type_enum" NOT NULL, "status" "public"."stock_alerts_status_enum" NOT NULL DEFAULT 'open', "message" character varying NOT NULL, "acknowledgedAt" TIMESTAMP WITH TIME ZONE, "resolvedAt" TIMESTAMP WITH TIME ZONE, "raisedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "medicine_id" uuid NOT NULL, "batch_id" uuid, "acknowledged_by_id" uuid, CONSTRAINT "PK_3c3bb550b3bf192460bffe3a55b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_stock_alerts_open_expiry" ON "stock_alerts"  ("batch_id") WHERE "type" IN ('expiring_soon', 'expired') AND "status" <> 'resolved'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_stock_alerts_open_level" ON "stock_alerts"  ("medicine_id") WHERE "type" IN ('low_stock', 'out_of_stock') AND "status" <> 'resolved'`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "action" character varying NOT NULL, "entityName" character varying NOT NULL, "entityId" character varying, "details" text, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "performed_by_id" uuid, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "processed_requests" ("requestId" uuid NOT NULL, "commandType" character varying NOT NULL, "payloadHash" character(64) NOT NULL, "result" jsonb NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_3ae30a0df02eaefe2066e7e9074" PRIMARY KEY ("requestId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("rolesId" uuid NOT NULL, "permissionsId" uuid NOT NULL, CONSTRAINT "PK_7931614007a93423204b4b73240" PRIMARY KEY ("rolesId", "permissionsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0cb93c5877d37e954e2aa59e52" ON "role_permissions"  ("rolesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d422dabc78ff74a8dab6583da0" ON "role_permissions"  ("permissionsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_289c20ebaf1d40f7f035f9a5015" FOREIGN KEY ("reverses_movement_id") REFERENCES "stock_movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_64c67f927d872a7e19700ab6637" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_decddbefd73204c1faab24aa4b5" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "batches" ADD CONSTRAINT "FK_eb09b3267452413f10fe991042e" FOREIGN KEY ("status_changed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "batches" ADD CONSTRAINT "FK_7caa4282b9d3c923684ba4889f1" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicine_prices" ADD CONSTRAINT "FK_42414b3419cbb15b4ab0877f59f" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicine_prices" ADD CONSTRAINT "FK_aa3b1b73f814228f2fd0da5b1ce" FOREIGN KEY ("set_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicines" ADD CONSTRAINT "FK_3f31019204c444b5b8c16cc0a5e" FOREIGN KEY ("category_id") REFERENCES "medicine_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicines" ADD CONSTRAINT "FK_a679ae24e26713fa017dbff3521" FOREIGN KEY ("base_unit_id") REFERENCES "units_of_measure"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "FK_8b410fe84cd9652da8c760ebe83" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "FK_bdf4d2d67f653e080a872de8f58" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "FK_7ef37f5270e92873913c80d183d" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" ADD CONSTRAINT "FK_1cc80e6e1bd6c9a07decb9560fe" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" ADD CONSTRAINT "FK_1dbba4c1816de4434adaa9daa56" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_returns" ADD CONSTRAINT "FK_2b61a5fa8b873de80fd16331667" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_returns" ADD CONSTRAINT "FK_7a1d98bf35e97708267880814a3" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_lines" ADD CONSTRAINT "FK_e7bcdad1f1d12c8d449910abd92" FOREIGN KEY ("assessed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_lines" ADD CONSTRAINT "FK_fd40e1466a99a6287c3c7406270" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_lines" ADD CONSTRAINT "FK_039a1ca67b91823c1082f6acaf9" FOREIGN KEY ("sale_line_id") REFERENCES "sale_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" ADD CONSTRAINT "FK_3c1694f38a418f7ad3335ecce96" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" ADD CONSTRAINT "FK_40f554965f02023df2a54737792" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_items" ADD CONSTRAINT "FK_a603d92d4a8459db5fbe45a4aea" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_items" ADD CONSTRAINT "FK_47969d67ea9e2ef9827c9f40d84" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" ADD CONSTRAINT "FK_82fe7455afa3dd5795d7a1625e1" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" ADD CONSTRAINT "FK_50fcb4a8a7a27348936216b87df" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" ADD CONSTRAINT "FK_591bc6ac005fae165a080dab6ea" FOREIGN KEY ("prescriber_id") REFERENCES "prescribers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" ADD CONSTRAINT "FK_5e2bc0e9b57a9f38e5cf207e98a" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" ADD CONSTRAINT "FK_d76bb8e668dd0bc9ee1ceafb078" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" ADD CONSTRAINT "FK_ca0be806ed796bfaff93144d06f" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" ADD CONSTRAINT "FK_13f871f1eabd560339a0b6f62a5" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" ADD CONSTRAINT "FK_e0a9c3903ea99df816c294727b0" FOREIGN KEY ("dispensed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_c51005b2b06cec7aa17462c54f5" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_297605f979cc5fae394dabe6201" FOREIGN KEY ("sold_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" ADD CONSTRAINT "FK_a7ae714c16c5e696265bf611e65" FOREIGN KEY ("stock_take_id") REFERENCES "stock_takes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" ADD CONSTRAINT "FK_e8ca6490186b5da6f9bcd10462c" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_takes" ADD CONSTRAINT "FK_8d29e6385b5531184c05bb83b53" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_takes" ADD CONSTRAINT "FK_5fa9c0bee298e37361ae3fcf882" FOREIGN KEY ("counted_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_takes" ADD CONSTRAINT "FK_bc0e32db62c948c85e291c1bbe4" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" ADD CONSTRAINT "FK_63bd0fdf44c9e0604ec7a0b5432" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" ADD CONSTRAINT "FK_1f073818408a35ebca7007ff7c0" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" ADD CONSTRAINT "FK_20fa1996e91f21138854c46c350" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_8bd66339fb98914129e1780301c" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_requests" ADD CONSTRAINT "FK_9bb1f41a21305749bcc067b0d4b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_0cb93c5877d37e954e2aa59e52c" FOREIGN KEY ("rolesId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_d422dabc78ff74a8dab6583da02" FOREIGN KEY ("permissionsId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );

    // ---- Written by hand: what TypeORM cannot declare on an entity ----

    // The ledger is append-only (BR05, FR-12). A trigger works whichever
    // database role the application connects as, including the table owner.
    await queryRunner.query(`CREATE FUNCTION "stock_movements_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'stock_movements is append-only; post a reversing movement instead (BR05)';
      END;
    $$`);
    await queryRunner.query(
      `CREATE TRIGGER "trg_stock_movements_append_only" BEFORE UPDATE OR DELETE ON "stock_movements" FOR EACH ROW EXECUTE FUNCTION "stock_movements_append_only"()`,
    );

    // Expiry alerts name a batch; stock-level alerts do not (decision 16).
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" ADD CONSTRAINT "ck_stock_alerts_batch_by_type" CHECK (("type" IN ('expiring_soon', 'expired') AND "batch_id" IS NOT NULL) OR ("type" IN ('low_stock', 'out_of_stock') AND "batch_id" IS NULL))`,
    );

    // A reversal must be the exact opposite of a movement that is not itself
    // a reversal, on the same batch and of the same type (BR05). Without
    // this, any row with reverses_movement_id set would skip the sign CHECK.
    await queryRunner.query(`CREATE FUNCTION "stock_movements_check_reversal"() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        original "stock_movements"%ROWTYPE;
      BEGIN
        IF NEW."reverses_movement_id" IS NULL THEN
          RETURN NEW;
        END IF;
        SELECT * INTO original FROM "stock_movements" WHERE "id" = NEW."reverses_movement_id";
        IF NOT FOUND
          OR original."reverses_movement_id" IS NOT NULL
          OR original."batch_id" <> NEW."batch_id"
          OR original."type" <> NEW."type"
          OR NEW."deltaSellable" <> -original."deltaSellable"
          OR NEW."deltaQuarantine" <> -original."deltaQuarantine"
          OR NEW."deltaPendingDestruction" <> -original."deltaPendingDestruction"
        THEN
          RAISE EXCEPTION 'a reversal must exactly negate a non-reversal movement of the same batch and type (BR05)'
            USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
      END;
    $$`);
    await queryRunner.query(
      `CREATE TRIGGER "trg_stock_movements_check_reversal" BEFORE INSERT ON "stock_movements" FOR EACH ROW EXECUTE FUNCTION "stock_movements_check_reversal"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "trg_stock_movements_check_reversal" ON "stock_movements"`,
    );
    await queryRunner.query(`DROP FUNCTION "stock_movements_check_reversal"()`);
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" DROP CONSTRAINT "ck_stock_alerts_batch_by_type"`,
    );
    await queryRunner.query(
      `DROP TRIGGER "trg_stock_movements_append_only" ON "stock_movements"`,
    );
    await queryRunner.query(`DROP FUNCTION "stock_movements_append_only"()`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_d422dabc78ff74a8dab6583da02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_0cb93c5877d37e954e2aa59e52c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_requests" DROP CONSTRAINT "FK_9bb1f41a21305749bcc067b0d4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_8bd66339fb98914129e1780301c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" DROP CONSTRAINT "FK_20fa1996e91f21138854c46c350"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" DROP CONSTRAINT "FK_1f073818408a35ebca7007ff7c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_alerts" DROP CONSTRAINT "FK_63bd0fdf44c9e0604ec7a0b5432"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_takes" DROP CONSTRAINT "FK_bc0e32db62c948c85e291c1bbe4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_takes" DROP CONSTRAINT "FK_5fa9c0bee298e37361ae3fcf882"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_takes" DROP CONSTRAINT "FK_8d29e6385b5531184c05bb83b53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" DROP CONSTRAINT "FK_e8ca6490186b5da6f9bcd10462c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" DROP CONSTRAINT "FK_a7ae714c16c5e696265bf611e65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_297605f979cc5fae394dabe6201"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_c51005b2b06cec7aa17462c54f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" DROP CONSTRAINT "FK_e0a9c3903ea99df816c294727b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" DROP CONSTRAINT "FK_13f871f1eabd560339a0b6f62a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" DROP CONSTRAINT "FK_ca0be806ed796bfaff93144d06f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" DROP CONSTRAINT "FK_d76bb8e668dd0bc9ee1ceafb078"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispense_lines" DROP CONSTRAINT "FK_5e2bc0e9b57a9f38e5cf207e98a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" DROP CONSTRAINT "FK_591bc6ac005fae165a080dab6ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" DROP CONSTRAINT "FK_50fcb4a8a7a27348936216b87df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" DROP CONSTRAINT "FK_82fe7455afa3dd5795d7a1625e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_items" DROP CONSTRAINT "FK_47969d67ea9e2ef9827c9f40d84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_items" DROP CONSTRAINT "FK_a603d92d4a8459db5fbe45a4aea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" DROP CONSTRAINT "FK_40f554965f02023df2a54737792"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" DROP CONSTRAINT "FK_3c1694f38a418f7ad3335ecce96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_lines" DROP CONSTRAINT "FK_039a1ca67b91823c1082f6acaf9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_lines" DROP CONSTRAINT "FK_fd40e1466a99a6287c3c7406270"`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_lines" DROP CONSTRAINT "FK_e7bcdad1f1d12c8d449910abd92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_returns" DROP CONSTRAINT "FK_7a1d98bf35e97708267880814a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_returns" DROP CONSTRAINT "FK_2b61a5fa8b873de80fd16331667"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" DROP CONSTRAINT "FK_1dbba4c1816de4434adaa9daa56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" DROP CONSTRAINT "FK_1cc80e6e1bd6c9a07decb9560fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "FK_7ef37f5270e92873913c80d183d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "FK_bdf4d2d67f653e080a872de8f58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "FK_8b410fe84cd9652da8c760ebe83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicines" DROP CONSTRAINT "FK_a679ae24e26713fa017dbff3521"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicines" DROP CONSTRAINT "FK_3f31019204c444b5b8c16cc0a5e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicine_prices" DROP CONSTRAINT "FK_aa3b1b73f814228f2fd0da5b1ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicine_prices" DROP CONSTRAINT "FK_42414b3419cbb15b4ab0877f59f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "batches" DROP CONSTRAINT "FK_7caa4282b9d3c923684ba4889f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "batches" DROP CONSTRAINT "FK_eb09b3267452413f10fe991042e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_decddbefd73204c1faab24aa4b5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_64c67f927d872a7e19700ab6637"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_289c20ebaf1d40f7f035f9a5015"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d422dabc78ff74a8dab6583da0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0cb93c5877d37e954e2aa59e52"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "processed_requests"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."uq_stock_alerts_open_level"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_stock_alerts_open_expiry"`,
    );
    await queryRunner.query(`DROP TABLE "stock_alerts"`);
    await queryRunner.query(`DROP TYPE "public"."stock_alerts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."stock_alerts_type_enum"`);
    await queryRunner.query(`DROP TABLE "stock_takes"`);
    await queryRunner.query(`DROP TYPE "public"."stock_takes_status_enum"`);
    await queryRunner.query(`DROP TABLE "stock_take_lines"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
    await queryRunner.query(`DROP TABLE "dispense_lines"`);
    await queryRunner.query(`DROP TABLE "prescriptions"`);
    await queryRunner.query(`DROP TYPE "public"."prescriptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "prescribers"`);
    await queryRunner.query(`DROP TABLE "prescription_items"`);
    await queryRunner.query(`DROP TABLE "sale_lines"`);
    await queryRunner.query(`DROP TABLE "return_lines"`);
    await queryRunner.query(
      `DROP TYPE "public"."return_lines_assessmentstatus_enum"`,
    );
    await queryRunner.query(`DROP TABLE "sale_returns"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
    await queryRunner.query(`DROP TABLE "goods_receipts"`);
    await queryRunner.query(`DROP TABLE "goods_receipt_lines"`);
    await queryRunner.query(`DROP TABLE "medicines"`);
    await queryRunner.query(
      `DROP TYPE "public"."medicines_classification_enum"`,
    );
    await queryRunner.query(`DROP TABLE "medicine_prices"`);
    await queryRunner.query(`DROP TABLE "units_of_measure"`);
    await queryRunner.query(`DROP TABLE "medicine_categories"`);
    await queryRunner.query(`DROP TABLE "batches"`);
    await queryRunner.query(`DROP TYPE "public"."batches_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."ix_stock_movements_batch_occurred"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(
      `DROP TYPE "public"."stock_movements_sourcedocumenttype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."stock_movements_type_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
