import { MigrationInterface, QueryRunner } from 'typeorm';

export class SagaStatuses1789600000000 implements MigrationInterface {
  name = 'SagaStatuses1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."service_orders_status_enum" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."service_orders_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values; recreate the type.
    await queryRunner.query(
      `UPDATE "service_orders" SET "status" = 'RECEIVED' WHERE "status" IN ('AWAITING_PAYMENT', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."service_orders_status_enum" RENAME TO "service_orders_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_orders_status_enum" AS ENUM('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_EXECUTION', 'FINISHED', 'DELIVERED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ALTER COLUMN "status" TYPE "public"."service_orders_status_enum" USING "status"::text::"public"."service_orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ALTER COLUMN "status" SET DEFAULT 'RECEIVED'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."service_orders_status_enum_old"`,
    );
  }
}
