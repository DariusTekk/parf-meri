import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

// Her test dosyası kendi geçici veritabanı ve yükleme klasörüyle çalışır.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parfum-test-'));
// Testler her zaman süreç içi PostgreSQL (PGlite) ve yerel diskle çalışır; uzak kaynaklara dokunmaz.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_URL_UNPOOLED;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.LOCAL_DB_DIR = path.join(dir, 'db');
process.env.UPLOAD_DIR = path.join(dir, 'uploads');
process.env.SITE_URL = 'http://localhost:3000';

afterAll(async () => {
  const { closeDb } = await import('@/lib/server/db');
  await closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});
