import fs from 'node:fs';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { getEnv } from '../env';
import type { Database } from './types';

type DbHolder = { db: Kysely<Database>; sqlite: SQLite.Database; path: string; queries: number };

const globalForDb = globalThis as unknown as { __parfumDb?: DbHolder };

function open(dbPath: string): DbHolder {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new SQLite(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');
  const holder: DbHolder = {
    sqlite,
    path: dbPath,
    queries: 0,
    db: undefined as unknown as Kysely<Database>,
  };
  holder.db = new Kysely<Database>({
    dialect: new SqliteDialect({ database: sqlite }),
    log: (event) => {
      if (event.level === 'query') holder.queries += 1;
    },
  });
  return holder;
}

function holder(): DbHolder {
  const dbPath = getEnv().databasePath;
  const current = globalForDb.__parfumDb;
  if (current && current.path === dbPath) return current;
  if (current) current.sqlite.close();
  globalForDb.__parfumDb = open(dbPath);
  return globalForDb.__parfumDb;
}

export function getDb(): Kysely<Database> {
  return holder().db;
}

export function getSqlite(): SQLite.Database {
  return holder().sqlite;
}

/** Test ve ölçüm için: şimdiye kadar çalıştırılan sorgu sayısı. */
export function queryCount(): number {
  return holder().queries;
}

export async function closeDb(): Promise<void> {
  const current = globalForDb.__parfumDb;
  if (current) {
    await current.db.destroy();
    globalForDb.__parfumDb = undefined;
  }
}
