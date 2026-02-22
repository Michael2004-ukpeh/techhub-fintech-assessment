import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivateWallet1771799461804 implements MigrationInterface {
    name = 'ActivateWallet1771799461804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallets" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "balance" TYPE numeric(15,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallets" ALTER COLUMN "balance" TYPE numeric(18,2)`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "isActive"`);
    }

}
