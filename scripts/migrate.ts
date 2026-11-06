import { closeDb } from '../src/lib/server/db';
import {
  migrateAllDown,
  migrateDown,
  migrateToLatest,
  migrationNames,
} from '../src/lib/server/db/migrate';
import { getEnv } from '../src/lib/server/env';

const command = process.argv[2] ?? 'latest';

async function main() {
  console.log(`Veritabanı: ${getEnv().databasePath}`);
  if (command === 'latest') {
    const r = await migrateToLatest();
    const applied = r.results?.map((m) => m.migrationName) ?? [];
    console.log(applied.length ? `Uygulandı: ${applied.join(', ')}` : 'Veritabanı güncel.');
  } else if (command === 'down') {
    const r = await migrateDown();
    console.log(`Geri alındı: ${r.results?.map((m) => m.migrationName).join(', ') || 'yok'}`);
  } else if (command === 'check') {
    await migrateToLatest();
    console.log(`Yukarı: ${migrationNames.join(', ')}`);
    await migrateAllDown();
    console.log('Aşağı: tüm migrasyonlar geri alındı');
    await migrateToLatest();
    console.log('Yukarı: yeniden uygulandı. Sonuç: başarılı');
  } else {
    throw new Error(`Bilinmeyen komut: ${command}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
