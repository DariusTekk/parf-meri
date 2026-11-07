import './env-yukle';
import { closeDb } from '../src/lib/server/db';
import { migrateToLatest } from '../src/lib/server/db/migrate';
import { clearDemo, loadDemo } from '../src/lib/server/demo';
import { describeDatabase } from '../src/lib/server/env';

const command = process.argv[2];

async function main() {
  console.log(`Veritabanı: ${describeDatabase()}`);
  await migrateToLatest();
  if (command === 'load') {
    const c = await loadDemo();
    console.log('Demo veri yüklendi.');
    console.table(c);
  } else if (command === 'clear') {
    const c = await clearDemo();
    console.log('Demo veri silindi. Veritabanında kalan demo kayıt sayıları:');
    console.table(c);
  } else {
    throw new Error('Kullanım: npm run demo:load | npm run demo:clear');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
