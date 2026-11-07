import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { Kysely, PostgresDialect, type Dialect } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Pool } from 'pg';
import { getEnv } from '../env';
import type { Database } from './types';

type DbHolder = { db: Kysely<Database>; key: string; queries: number };

const globalForDb = globalThis as unknown as { __parfumDb?: DbHolder };

function createDialect(key: string, connectionString: string | null): Dialect {
  if (connectionString) {
    return new PostgresDialect({
      pool: new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 }),
    });
  }
  // Yerel geliştirme ve testler: sunucu kurmadan, diskte kalıcı, süreç içi PostgreSQL.
  fs.mkdirSync(key, { recursive: true });
  return new PGliteDialect(new PGlite(key));
}

function open(key: string, connectionString: string | null): DbHolder {
  const holder: DbHolder = { key, queries: 0, db: undefined as unknown as Kysely<Database> };
  holder.db = new Kysely<Database>({
    dialect: createDialect(key, connectionString),
    log: (event) => {
      if (event.level === 'query') holder.queries += 1;
      if (event.level === 'error') console.error('Veritabanı sorgusu başarısız oldu.');
    },
  });
  return holder;
}

function holder(forMigration = false): DbHolder {
  const env = getEnv();
  const url = forMigration ? env.migrationDatabaseUrl : env.databaseUrl;
  const key = url ?? env.localDbDir;
  const current = globalForDb.__parfumDb;
  if (current && current.key === key) return current;
  if (current) void current.db.destroy();
  globalForDb.__parfumDb = open(key, url);
  return globalForDb.__parfumDb;
}

export function getDb(): Kysely<Database> {
  return holder().db;
}

/** Migrasyonlar havuzsuz bağlantıyla çalışır (Neon'da DATABASE_URL_UNPOOLED). */
export function getMigrationDb(): Kysely<Database> {
  return holder(true).db;
}

/** Test ve ölçüm için: şimdiye kadar çalıştırılan sorgu sayısı. */
export function queryCount(): number {
  return holder().queries;
}

export function isLocalDatabase(): boolean {
  return getEnv().databaseUrl === null;
}

export async function closeDb(): Promise<void> {
  const current = globalForDb.__parfumDb;
  if (current) {
    globalForDb.__parfumDb = undefined;
    await current.db.destroy();
  }
}
