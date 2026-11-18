import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

// `.ts` via ts-node in development, compiled `.js` in the production image
// (avoids loading the emitted `.d.ts` files).
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

/**
 * DataSource used exclusively by the TypeORM CLI (generate/run/revert).
 * The runtime connection is configured in AppModule.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'auto_repair',
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
  entities: [`${__dirname}/**/*.entity.${ext}`],
  migrations: [`${__dirname}/migrations/*.${ext}`],
  // Never let the CLI mutate the schema implicitly.
  synchronize: false,
});
