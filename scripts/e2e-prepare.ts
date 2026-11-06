import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createAdmin } from '../src/lib/server/auth';
import { closeDb } from '../src/lib/server/db';
import { migrateToLatest } from '../src/lib/server/db/migrate';
import { loadDemo } from '../src/lib/server/demo';
import { getEnv } from '../src/lib/server/env';

/**
 * Uçtan uca testler için sıfırdan veritabanı: migrasyonlar, demo veri ve rastgele parolalı
 * iki test yöneticisi (biri kilitlenme testine ayrılmış). Bilgiler .e2e/admin.json dosyasına
 * yazılır; klasör .gitignore kapsamındadır.
 */
async function main() {
  const env = getEnv();
  const dir = path.dirname(env.databasePath);
  if (!dir.includes('.e2e'))
    throw new Error('Bu betik yalnızca .e2e klasöründeki test veritabanında çalışır.');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await migrateToLatest();
  await loadDemo();
  const accounts = {
    main: { email: 'yonetici@e2e.test', password: randomBytes(18).toString('base64url') },
    lock: { email: 'kilit@e2e.test', password: randomBytes(18).toString('base64url') },
  };
  await createAdmin(accounts.main.email, accounts.main.password);
  await createAdmin(accounts.lock.email, accounts.lock.password);
  fs.writeFileSync(path.join(dir, 'admin.json'), JSON.stringify(accounts));
  console.log('Uçtan uca test veritabanı hazır.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
