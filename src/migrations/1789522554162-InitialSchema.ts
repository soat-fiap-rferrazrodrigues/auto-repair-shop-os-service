import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789522554162 implements MigrationInterface {
  name = 'InitialSchema1789522554162';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "cpfCnpj" character varying NOT NULL, "email" character varying, "phone" character varying, "address" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3746312d5950b4f5c6f8982555f" UNIQUE ("cpfCnpj"), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "price" numeric(10,2) NOT NULL, "estimatedMinutes" integer NOT NULL DEFAULT '60', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "serviceId" uuid NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_74f048f792fe40516ac248ce060" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "unitPrice" numeric(10,2) NOT NULL, "stockQuantity" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_daa5595bb8933f49ac00c9ebc79" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "partId" uuid NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(10,2) NOT NULL, CONSTRAINT "PK_5ddaf71b0958a588005f70373a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_orders_status_enum" AS ENUM('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_EXECUTION', 'FINISHED', 'DELIVERED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vehicleId" uuid NOT NULL, "status" "public"."service_orders_status_enum" NOT NULL DEFAULT 'RECEIVED', "totalPrice" numeric(10,2) NOT NULL DEFAULT '0', "approvedAt" TIMESTAMP, "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "deliveredAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_914aa74962ee83b10614ea2095d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plate" character varying NOT NULL, "brand" character varying NOT NULL, "model" character varying NOT NULL, "year" integer NOT NULL, "clientId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ec7181ebdab798d97070122a5bf" UNIQUE ("plate"), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'client')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'admin', "clientId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_services" ADD CONSTRAINT "FK_db8265e367f7c973cd4fe5e17af" FOREIGN KEY ("orderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_services" ADD CONSTRAINT "FK_714fa9ff7e2a619c3102352fd18" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_parts" ADD CONSTRAINT "FK_790f388a94f5ffc752754e3d0f8" FOREIGN KEY ("orderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_parts" ADD CONSTRAINT "FK_009833ff74f9f66e1ab72a97320" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_0b9f8edfa56f9f5ea6443c6aa45" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_152c413c6b66761cb34acb555c6" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_status_created" ON "service_orders" ("status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicles_client" ON "vehicles" ("clientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_services_order" ON "order_services" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_parts_order" ON "order_parts" ("orderId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_order_parts_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_order_services_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vehicles_client"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_status_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_152c413c6b66761cb34acb555c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_0b9f8edfa56f9f5ea6443c6aa45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_parts" DROP CONSTRAINT "FK_009833ff74f9f66e1ab72a97320"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_parts" DROP CONSTRAINT "FK_790f388a94f5ffc752754e3d0f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_services" DROP CONSTRAINT "FK_714fa9ff7e2a619c3102352fd18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_services" DROP CONSTRAINT "FK_db8265e367f7c973cd4fe5e17af"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "service_orders"`);
    await queryRunner.query(`DROP TYPE "public"."service_orders_status_enum"`);
    await queryRunner.query(`DROP TABLE "order_parts"`);
    await queryRunner.query(`DROP TABLE "parts"`);
    await queryRunner.query(`DROP TABLE "order_services"`);
    await queryRunner.query(`DROP TABLE "services"`);
    await queryRunner.query(`DROP TABLE "clients"`);
  }
}
