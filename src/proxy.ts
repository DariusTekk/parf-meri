import { NextResponse, type NextRequest } from 'next/server';

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const https = (process.env.SITE_URL ?? '').startsWith('https://');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

const SESSION_COOKIES = ['__Host-oturum', 'oturum'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Kolaylık yönlendirmesi; asıl yetki denetimi her sayfa ve uç noktada sunucuda yapılır.
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/giris')) {
    const hasCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/giris';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  if (pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|gorsel|fonts|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
