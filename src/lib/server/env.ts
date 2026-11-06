import path from 'node:path';

function resolveFromCwd(value: string | undefined, fallback: string[]): string {
  if (value && value.trim() !== '')
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), value);
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...fallback);
}

export function getEnv() {
  const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const cookieSecureRaw = process.env.COOKIE_SECURE?.trim();
  return {
    databasePath: resolveFromCwd(process.env.DATABASE_PATH, ['data', 'app.sqlite']),
    uploadDir: resolveFromCwd(process.env.UPLOAD_DIR, ['storage', 'uploads']),
    siteUrl,
    isProduction: process.env.NODE_ENV === 'production',
    cookieSecure: cookieSecureRaw
      ? cookieSecureRaw === 'true'
      : process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
  };
}
