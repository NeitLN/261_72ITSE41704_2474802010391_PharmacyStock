import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Everyone who counted or submitted a stock take (#215). A line keeps only
 * its latest counter, so an earlier counter whose count was overwritten
 * could approve; BR08 now checks this list. Existing stock takes get the
 * counters their lines and their submitter still show.
 */
export class StockTakeCounters1793100000000 implements MigrationInterface {
  name = 'StockTakeCounters1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stock_take_counters" ("stock_take_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_33da00caec1804f90bb2c480ef9" PRIMARY KEY ("stock_take_id", "user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_counters" ADD CONSTRAINT "FK_1738fa53b6bf62ca6af7e84784c" FOREIGN KEY ("stock_take_id") REFERENCES "stock_takes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_counters" ADD CONSTRAINT "FK_451527168e09e2125c90fb477b7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "stock_take_counters" ("stock_take_id", "user_id")
       SELECT "stock_take_id", "counted_by_id" FROM "stock_take_lines" WHERE "counted_by_id" IS NOT NULL
       UNION
       SELECT "id", "counted_by_id" FROM "stock_takes" WHERE "counted_by_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_take_counters" DROP CONSTRAINT "FK_451527168e09e2125c90fb477b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_counters" DROP CONSTRAINT "FK_1738fa53b6bf62ca6af7e84784c"`,
    );
    await queryRunner.query(`DROP TABLE "stock_take_counters"`);
  }
}
