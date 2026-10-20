import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A stock movement is stamped when its row is written, not when its
 * transaction began, so batch history (UC04) lists movements in the order
 * they changed the stock.
 */
export class MovementTimeAtWrite1792504000000 implements MigrationInterface {
  name = 'MovementTimeAtWrite1792504000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "occurredAt" SET DEFAULT clock_timestamp()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "occurredAt" SET DEFAULT now()`,
    );
  }
}
