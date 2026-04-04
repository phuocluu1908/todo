import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

const databaseUrl = process.env.DATABASE_URL;
const host = process.env.DB_HOST ?? '127.0.0.1';
const port = Number(process.env.DB_PORT ?? 5432);
const username = process.env.DB_USER ?? 'root';
const password = process.env.DB_PASSWORD ?? '';
const database = process.env.DB_NAME ?? 'todo_db';

// Determine SSL: enable when using a DATABASE_URL that requests sslmode=require
const shouldUseSsl = !!(
  process.env.DB_SSL === 'true' ||
  (databaseUrl && databaseUrl.includes('sslmode=require'))
);

// Allow a lightweight sqlite fallback for local dev when no Postgres config is provided
const useSqliteFallback =
  process.env.DB_TYPE === 'sqlite' || (!databaseUrl && !process.env.DB_HOST);

const common = {
  entities: [path.join(__dirname, '/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
};

const AppDataSource = new DataSource(
  useSqliteFallback
    ? {
        type: 'sqlite',
        database: process.env.SQLITE_DB || 'todo.sqlite',
        synchronize: true,
        ...common,
      }
    : {
        type: 'postgres',
        // prefer full DATABASE_URL if provided (useful for Neon, Heroku, etc.)
        url: databaseUrl ?? undefined,
        host: databaseUrl ? undefined : host,
        port: databaseUrl ? undefined : port,
        username: databaseUrl ? undefined : username,
        password: databaseUrl ? undefined : password,
        database: databaseUrl ? undefined : database,
        synchronize: false,
        ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        ...common,
      },
);

export default AppDataSource;
