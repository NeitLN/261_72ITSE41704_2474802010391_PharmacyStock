import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Three changes from the final code review, added together:
 *
 * - `users."tokenVersion"`, copied into each session token. Signing out,
 *   resetting the password or locking the account raises it, so a token
 *   issued before stops working at once instead of living on for the rest
 *   of its 8 hours.
 * - One line per batch on a stock take, enforced by the database as well as
 *   by the service, so a retried request cannot add the same batch twice.
 * - Indexes on the foreign keys that join a document to its lines and to the
 *   batches they used, which the reports, the batch history and the return
 *   lookup follow.
 */
export class ReviewHardening1793400000000 implements MigrationInterface {
  name = 'ReviewHardening1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "tokenVersion" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_stock_take_lines_take_batch" ON "stock_take_lines" ("stock_take_id", "batch_id")`,
    );
    for (const [table, column] of INDEXED) {
      await queryRunner.query(
        `CREATE INDEX "ix_${table}_${column}" ON "${table}" ("${column}")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [...INDEXED].reverse()) {
      await queryRunner.query(`DROP INDEX "public"."ix_${table}_${column}"`);
    }
    await queryRunner.query(
      `DROP INDEX "public"."uq_stock_take_lines_take_batch"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tokenVersion"`);
  }
}

const INDEXED: Array<[string, string]> = [
  ['goods_receipt_lines', 'goods_receipt_id'],
  ['goods_receipt_lines', 'batch_id'],
  ['sale_lines', 'sale_id'],
  ['sale_lines', 'batch_id'],
  ['sale_returns', 'sale_id'],
  ['return_lines', 'sale_return_id'],
  ['return_lines', 'sale_line_id'],
  ['prescription_items', 'prescription_id'],
  ['dispense_lines', 'prescription_id'],
  ['dispense_lines', 'prescription_item_id'],
  ['dispense_lines', 'batch_id'],
  ['dispense_lines', 'sale_id'],
  ['prescriptions', 'customer_id'],
  ['destruction_records', 'batch_id'],
];
