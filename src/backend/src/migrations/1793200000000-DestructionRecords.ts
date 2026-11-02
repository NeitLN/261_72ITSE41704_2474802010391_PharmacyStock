import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The record of a destruction (FR-47, DEC-04): date, method and witness,
 * linked one to one to the DESTROY movement it posted (#105).
 */
export class DestructionRecords1793200000000 implements MigrationInterface {
  name = 'DestructionRecords1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."destruction_records_method_enum" AS ENUM('supplier_return', 'licensed_contractor', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "destruction_records" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "quantity" integer NOT NULL, "destroyedOn" date NOT NULL, "method" "public"."destruction_records_method_enum" NOT NULL, "methodNote" character varying, "witness" character varying NOT NULL, "note" character varying, "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "batch_id" uuid NOT NULL, "movement_id" uuid NOT NULL, "recorded_by_id" uuid NOT NULL, CONSTRAINT "REL_c1c5b967de21fac0b75c0d8db5" UNIQUE ("movement_id"), CONSTRAINT "ck_destruction_records_quantity" CHECK ("quantity" > 0), CONSTRAINT "PK_313a7efdcf326ccb74d1eb40663" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "destruction_records" ADD CONSTRAINT "FK_7713b26bfed806cb2245d3267c6" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "destruction_records" ADD CONSTRAINT "FK_c1c5b967de21fac0b75c0d8db5e" FOREIGN KEY ("movement_id") REFERENCES "stock_movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "destruction_records" ADD CONSTRAINT "FK_efef0f7a70c4f72e3f073aafc08" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "destruction_records" DROP CONSTRAINT "FK_efef0f7a70c4f72e3f073aafc08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "destruction_records" DROP CONSTRAINT "FK_c1c5b967de21fac0b75c0d8db5e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "destruction_records" DROP CONSTRAINT "FK_7713b26bfed806cb2245d3267c6"`,
    );
    await queryRunner.query(`DROP TABLE "destruction_records"`);
    await queryRunner.query(`DROP TYPE "public"."destruction_records_method_enum"`);
  }
}
