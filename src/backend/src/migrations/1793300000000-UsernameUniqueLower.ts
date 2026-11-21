import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Usernames are unique without regard to letter case (UC15, UC16). The
 * service checks first, but two managers adding `Bob` and `bob` at the same
 * moment could both pass that check; this index makes the second one fail.
 * TypeORM cannot express an index on an expression, so the entity declares
 * it with `synchronize: false` and this migration owns it.
 */
export class UsernameUniqueLower1793300000000 implements MigrationInterface {
  name = 'UsernameUniqueLower1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_username_lower" ON "users" (LOWER("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_users_username_lower"`);
  }
}
