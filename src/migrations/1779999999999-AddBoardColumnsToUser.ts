import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardColumnsToUser1779999999999 implements MigrationInterface {
  name = 'AddBoardColumnsToUser1779999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "boardColumns" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "boardColumns"`);
  }
}
