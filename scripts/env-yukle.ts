import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Betikler, Next.js uygulaması gibi proje kökündeki `.env.local` ve `.env` dosyalarını okur
 * (öncelik `.env.local`). Ortamda zaten tanımlı değişkenlerin üzerine yazılmaz; böylece
 * testlerde ve CI'da verilen değerler korunur. Bu modül her betiğin ilk içe aktarımıdır.
 */
for (const name of ['.env.local', '.env']) {
  const file = path.join(process.cwd(), name);
  if (!fs.existsSync(file)) continue;
  // Windows'ta kaydedilen dosyaların başındaki BOM ilk değişkenin adını bozmasın.
  const values = parseEnv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
