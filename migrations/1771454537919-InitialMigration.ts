import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1771454537919 implements MigrationInterface {
    name = 'InitialMigration1771454537919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('credit', 'debit', 'transfer_in', 'transfer_out')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "walletId" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "amount" numeric(15,2) NOT NULL, "reference" uuid NOT NULL, "description" text, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'completed', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a88f466d39796d3081cf96e1b6" ON "transactions" ("walletId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd85cc865e0c3d5d4be095d3f3" ON "transactions" ("reference") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying, "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "balance" numeric(18,2) NOT NULL DEFAULT '0', "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2ecdb33f23e9a6fc392025c0b97" UNIQUE ("userId"), CONSTRAINT "REL_2ecdb33f23e9a6fc392025c0b9" UNIQUE ("userId"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transfers_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "senderWalletId" uuid NOT NULL, "receiverWalletId" uuid NOT NULL, "amount" numeric(15,2) NOT NULL, "reference" uuid NOT NULL, "status" "public"."transfers_status_enum" NOT NULL DEFAULT 'completed', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0fc842177d680a93c38ebed9c8" ON "transfers" ("senderWalletId") `);
        await queryRunner.query(`CREATE INDEX "IDX_61737523b755afdfa6d07cbf91" ON "transfers" ("receiverWalletId") `);
        await queryRunner.query(`CREATE INDEX "IDX_850ecad1c8031dc94c396c9f18" ON "transfers" ("reference") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_2ecdb33f23e9a6fc392025c0b97" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_0fc842177d680a93c38ebed9c8b" FOREIGN KEY ("senderWalletId") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_61737523b755afdfa6d07cbf915" FOREIGN KEY ("receiverWalletId") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "query-result-cache"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_61737523b755afdfa6d07cbf915"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_0fc842177d680a93c38ebed9c8b"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "FK_2ecdb33f23e9a6fc392025c0b97"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a88f466d39796d3081cf96e1b66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_850ecad1c8031dc94c396c9f18"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_61737523b755afdfa6d07cbf91"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fc842177d680a93c38ebed9c8"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
        await queryRunner.query(`DROP TYPE "public"."transfers_status_enum"`);
        await queryRunner.query(`DROP TABLE "wallets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd85cc865e0c3d5d4be095d3f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a88f466d39796d3081cf96e1b6"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    }

}
