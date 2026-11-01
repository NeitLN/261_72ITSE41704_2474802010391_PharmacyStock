import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The medicines chosen when a stock take is opened (#184). A chosen medicine
 * with no stock on the book gets no line, so the lines alone cannot say
 * which batches the counter may add (A3). Existing stock takes get the
 * medicines of their lines, which is all they could add until now. Both
 * foreign keys are NO ACTION, as everywhere else in the schema.
 */
export class StockTakeMedicines1793000000000 implements MigrationInterface {
  name = 'StockTakeMedicines1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stock_take_medicines" ("stock_take_id" uuid NOT NULL, "medicine_id" uuid NOT NULL, CONSTRAINT "PK_4e0a02a20862062afe0daeec68a" PRIMARY KEY ("stock_take_id", "medicine_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_medicines" ADD CONSTRAINT "FK_0068dfcdfcdb1c7d8f40680352c" FOREIGN KEY ("stock_take_id") REFERENCES "stock_takes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_medicines" ADD CONSTRAINT "FK_a3da51900448be8e26a3d46ded0" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "stock_take_medicines" ("stock_take_id", "medicine_id")
       SELECT DISTINCT l."stock_take_id", b."medicine_id"
       FROM "stock_take_lines" l JOIN "batches" b ON b."id" = l."batch_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_take_medicines" DROP CONSTRAINT "FK_a3da51900448be8e26a3d46ded0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_medicines" DROP CONSTRAINT "FK_0068dfcdfcdb1c7d8f40680352c"`,
    );
    await queryRunner.query(`DROP TABLE "stock_take_medicines"`);
  }
}
