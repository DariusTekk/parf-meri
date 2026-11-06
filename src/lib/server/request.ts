import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { validateSessionToken, type SessionAdmin } from './auth';
import { getEnv } from './env';
import { HttpError } from './http';

export function sessionCookieName(): string {
  return getEnv().cookieSecure ? '__Host-oturum' : 'oturum';
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: getEnv().cookieSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function currentAdmin(): Promise<SessionAdmin | null> {
  const store = await cookies();
  return validateSessionToken(store.get(sessionCookieName())?.value);
}

/** Panel sayfaları için: oturum yoksa giriş sayfasına yönlendirir. */
export async function requireAdminPage(): Promise<SessionAdmin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/giris?neden=oturum');
  return admin;
}

/**
 * Durum değiştiren isteklerde kaynak denetimi: Origin başlığı sitenin kendi kökeni olmalı
 * ve panel istemcisinin gönderdiği özel başlık bulunmalı (çapraz köken isteğinde ön uçuş
 * gerektirdiği için form tabanlı CSRF'yi engeller).
 */
export function assertSameOrigin(request: NextRequest, requireCustomHeader = true): void {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return;
  const origin = request.headers.get('origin');
  const env = getEnv();
  const host =
    (env.trustProxy ? request.headers.get('x-forwarded-host') : null) ??
    request.headers.get('host');
  let originUrl: URL | null = null;
  try {
    originUrl = origin ? new URL(origin) : null;
  } catch {
    originUrl = null;
  }
  const allowed =
    originUrl !== null &&
    (originUrl.origin === new URL(env.siteUrl).origin || originUrl.host === host);
  if (!allowed) {
    throw new HttpError('yasak', 'İstek kaynağı doğrulanamadı.');
  }
  if (requireCustomHeader && request.headers.get('x-istek') !== 'panel') {
    throw new HttpError('yasak', 'İstek kaynağı doğrulanamadı.');
  }
}

/** Panel API uç noktaları için: önce oturum (401), sonra kaynak denetimi (403). */
export async function requireAdminApi(request: NextRequest): Promise<SessionAdmin> {
  const admin = await validateSessionToken(request.cookies.get(sessionCookieName())?.value);
  if (!admin)
    throw new HttpError(
      'yetkisiz',
      'Oturumunuz yok ya da süresi doldu. Lütfen tekrar giriş yapın.',
    );
  assertSameOrigin(request);
  return admin;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  if (getEnv().trustProxy) {
    // En sağdaki değer, güvenilen vekilin eklediği gerçek istemci adresidir; soldakiler istemcinin
    // kendi gönderdiği ve taklit edilebilen değerlerdir.
    const forwarded = h.get('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (forwarded) return forwarded;
  }
  // Vekil sunucu yoksa istemci başlıklarına güvenilmez; IP sınırı tüm istemciler için ortaktır.
  return 'dogrudan';
}
