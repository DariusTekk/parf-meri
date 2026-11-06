import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Depoya girecek dosyalarda sır taraması. Git varsa izlenen ve eklenecek dosyalar
 * (`git ls-files --cached --others --exclude-standard`), yoksa aşağıdaki dışlama listesiyle
 * çalışma dizini taranır. Bulgu varsa çıkış kodu 1 olur; değerler ekrana yazılmaz.
 */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  'out',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
  'data',
  'storage',
  'backups',
  '.e2e',
  'anlik-goruntuler',
  'ekran-goruntuleri',
  'lighthouse-raporlari',
  '.git',
]);
const BINARY = /\.(png|jpe?g|webp|avif|gif|ico|woff2?|zip|sqlite|db)$/i;

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Özel anahtar', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS erişim anahtarı', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub belirteci', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Slack belirteci', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Stripe gizli anahtarı', pattern: /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'Parola özeti', pattern: /\$argon2(id|i|d)\$v=\d+\$m=\d+/ },
  {
    name: 'Ortam dosyasında değer',
    pattern:
      /^(ADMIN_PASSWORD|[A-Z_]*SECRET[A-Z_]*|[A-Z_]*TOKEN[A-Z_]*|[A-Z_]*API_KEY[A-Z_]*)=\S+/m,
  },
  { name: 'JSON içinde parola', pattern: /"password"\s*:\s*"[^"]{6,}"/ },
];

function listFiles(): string[] {
  try {
    const out = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8' },
    );
    return out.split('\0').filter(Boolean);
  } catch {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORED_DIRS.has(e.name)) continue;
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (
          (!/^calisma-notlari.*\.md$/.test(e.name) && !/^\.env(\..+)?$/.test(e.name)) ||
          e.name === '.env.example'
        )
          files.push(rel);
      }
    };
    walk('.');
    return files;
  }
}

const findings: string[] = [];
const files = listFiles();
for (const file of files) {
  const base = path.basename(file);
  if (/^\.env($|\.(?!example$))/.test(base))
    findings.push(`${file}: ortam dosyası depoya girmemeli`);
  if (/\.(sqlite|db)(-wal|-shm)?$/i.test(base))
    findings.push(`${file}: veritabanı dosyası depoya girmemeli`);
  if (BINARY.test(file) || file.endsWith('package-lock.json')) continue;
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  for (const rule of RULES) {
    lines.forEach((line, i) => {
      if (rule.pattern.test(line)) findings.push(`${file}:${i + 1}: ${rule.name}`);
    });
  }
}

console.log(`${files.length} dosya tarandı.`);
if (findings.length > 0) {
  console.error(`Olası sır bulundu (${findings.length}):`);
  for (const f of findings) console.error(`  ${f}`);
  process.exitCode = 1;
} else {
  console.log('Sır bulunmadı.');
}
