import path from 'node:path';

function resolveFromCwd(value: string | undefined, fallback: string[]): string {
  if (value && value.trim() !== '')
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), value);
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...fallback);
}

function siteUrlFromEnv(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  // Vercel'de SITE_URL verilmemişse projenin üretim alan adı kullanılır.
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;
  return 'http://localhost:3000';
}

/** Betik çıktıları için: hangi veritabanına bağlanıldığı (parola yazılmaz). */
export function describeDatabase(): string {
  const env = getEnv();
  if (!env.databaseUrl) return `yerel PGlite (${env.localDbDir})`;
  try {
    const u = new URL(env.databaseUrl);
    return `PostgreSQL ${u.hostname}${u.pathname}`;
  } catch {
    return 'PostgreSQL (DATABASE_URL)';
  }
}

export function getEnv() {
  const cookieSecureRaw = process.env.COOKIE_SECURE?.trim();
  const trustProxyRaw = process.env.TRUST_PROXY?.trim();
  const onVercel = process.env.VERCEL === '1';
  return {
    /** Uzak PostgreSQL bağlantısı (Vercel'de Neon entegrasyonu tanımlar). Yoksa yerel PGlite kullanılır. */
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    /** Migrasyonlar için havuzsuz (doğrudan) bağlantı; yoksa DATABASE_URL. */
    migrationDatabaseUrl:
      process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim() || null,
    /** Yerel geliştirme ve testlerde süreç içi PostgreSQL'in (PGlite) veri klasörü. */
    localDbDir: resolveFromCwd(process.env.LOCAL_DB_DIR, ['data', 'pglite']),
    /** Görseller: Blob anahtarı varsa Vercel Blob, yoksa yerel disk. */
    blobToken: process.env.BLOB_READ_WRITE_TOKEN?.trim() || null,
    uploadDir: resolveFromCwd(process.env.UPLOAD_DIR, ['storage', 'uploads']),
    siteUrl: siteUrlFromEnv(),
    isProduction: process.env.NODE_ENV === 'production',
    onVercel,
    cookieSecure: cookieSecureRaw
      ? cookieSecureRaw === 'true'
      : process.env.NODE_ENV === 'production',
    // Vercel'in kenar sunucusu X-Forwarded-For başlığını kendisi yazar; orada vekile güvenilir.
    trustProxy: trustProxyRaw ? trustProxyRaw === 'true' : onVercel,
  };
}
