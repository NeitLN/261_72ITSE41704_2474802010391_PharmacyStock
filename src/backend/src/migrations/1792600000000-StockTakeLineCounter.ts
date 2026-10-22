import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Who saved the count of each stock-take line, so BR08 can refuse an
 * approver who counted any line, not only the user who pressed Submit.
 */
export class StockTakeLineCounter1792600000000 implements MigrationInterface {
  name = 'StockTakeLineCounter1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" ADD "counted_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" ADD CONSTRAINT "FK_2deda464db26b07579e470d6b6d" FOREIGN KEY ("counted_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" DROP CONSTRAINT "FK_2deda464db26b07579e470d6b6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_take_lines" DROP COLUMN "counted_by_id"`,
    );
  }
}
