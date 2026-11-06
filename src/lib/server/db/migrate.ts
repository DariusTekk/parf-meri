import { type Migration, type MigrationResultSet, Migrator } from 'kysely/migration';
import { getDb } from './index';
import * as m0001 from './migrations/0001_initial';
import * as m0002 from './migrations/0002_default_families';

const migrations: Record<string, Migration> = {
  '0001_initial': m0001,
  '0002_default_families': m0002,
};

export function getMigrator(): Migrator {
  return new Migrator({
    db: getDb(),
    provider: { getMigrations: async () => migrations },
  });
}

function assertOk(result: MigrationResultSet): MigrationResultSet {
  if (result.error) {
    const failed = result.results?.find((r) => r.status === 'Error');
    throw new Error(`Migrasyon başarısız: ${failed?.migrationName ?? 'bilinmiyor'}`, {
      cause: result.error,
    });
  }
  return result;
}

export async function migrateToLatest(): Promise<MigrationResultSet> {
  return assertOk(await getMigrator().migrateToLatest());
}

export async function migrateDown(): Promise<MigrationResultSet> {
  return assertOk(await getMigrator().migrateDown());
}

export async function migrateAllDown(): Promise<void> {
  const migrator = getMigrator();
  for (let i = 0; i < Object.keys(migrations).length; i += 1) {
    assertOk(await migrator.migrateDown());
  }
}

export const migrationNames = Object.keys(migrations);
