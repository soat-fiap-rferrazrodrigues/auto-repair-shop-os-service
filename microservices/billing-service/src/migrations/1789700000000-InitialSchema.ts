import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789700000000 implements MigrationInterface {
  name = 'InitialSchema1789700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await q.query(
      `CREATE TABLE "budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "items" jsonb NOT NULL, "total" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_budgets_orderId" UNIQUE ("orderId"), CONSTRAINT "PK_budgets" PRIMARY KEY ("id"))`,
    );
    await q.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED')`,
    );
    await q.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "preferenceId" character varying, "checkoutUrl" character varying, "mpPaymentId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_payments_orderId" UNIQUE ("orderId"), CONSTRAINT "PK_payments" PRIMARY KEY ("id"))`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "payments"`);
    await q.query(`DROP TYPE "public"."payments_status_enum"`);
    await q.query(`DROP TABLE "budgets"`);
  }
}
