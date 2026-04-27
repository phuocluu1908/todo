import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardColumnsToUser1779999999999 implements MigrationInterface {
  name = 'AddBoardColumnsToUser1779999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "boardColumns" text`);
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "refreshToken" character varying`);
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "createdAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "refreshToken"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "boardColumns"`);
  }
}
