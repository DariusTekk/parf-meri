import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

const API_ROOT = path.join('src', 'app', 'api', 'admin');
const PAGE_ROOT = path.join('src', 'app', 'admin', '(panel)');
const SAMPLE: Record<string, string> = {
  '[id]': '1',
  '[imageId]': '00000000-0000-4000-8000-000000000000',
  '[tur]': 'marka',
};

function walk(dir: string, file: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full, file);
    return e.name === file ? [full] : [];
  });
}

function toUrl(file: string, root: string, prefix: string) {
  const rel = path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean);
  return `${prefix}${rel
    .map((s) => SAMPLE[s] ?? s)
    .map((s) => (s.startsWith('(') ? '' : s))
    .filter(Boolean)
    .map((s) => `/${s}`)
    .join('')}`;
}

/** Tüm panel API uç noktaları dosya sisteminden otomatik toplanır; yeni uç nokta eklenince test de kapsar. */
const endpoints = walk(API_ROOT, 'route.ts').flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const methods = [
    ...source.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g),
  ].map((m) => m[1]!);
  return methods.map((method) => ({ method, url: toUrl(file, API_ROOT, '/api/admin') }));
});

const pages = walk(PAGE_ROOT, 'page.tsx').map((f) => toUrl(f, PAGE_ROOT, '/admin'));

test('panel API listesi boş değil', () => {
  expect(endpoints.length).toBeGreaterThanOrEqual(15);
  expect(pages.length).toBeGreaterThanOrEqual(10);
});

test.describe('Yetkisiz erişim', () => {
  for (const { method, url } of endpoints) {
    test(`${method} ${url} oturumsuz 401 döner`, async ({ request }) => {
      const res = await request.fetch(url, {
        method,
        headers: {
          'x-istek': 'panel',
          'content-type': 'application/json',
          origin: 'http://localhost:3100',
        },
        data: method === 'GET' ? undefined : '{}',
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.hata.kod).toBe('yetkisiz');
      expect(JSON.stringify(body)).not.toMatch(/at .*\.(ts|js)/);
    });
  }

  test('sahte oturum çereziyle de 401 döner', async ({ request }) => {
    for (const name of ['oturum', '__Host-oturum']) {
      const res = await request.post('/api/admin/parfumler', {
        headers: {
          cookie: `${name}=sahte-belirtec`,
          'x-istek': 'panel',
          origin: 'http://localhost:3100',
        },
        data: {},
      });
      expect(res.status()).toBe(401);
    }
  });

  for (const url of pages) {
    test(`${url} sayfası oturumsuz giriş sayfasına yönlenir`, async ({ request }) => {
      const res = await request.get(url, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(res.status());
      expect(res.headers().location).toContain('/admin/giris');
      const withFake = await request.get(url, {
        maxRedirects: 0,
        headers: { cookie: 'oturum=sahte' },
      });
      expect([302, 303, 307, 308]).toContain(withFake.status());
    });
  }

  test('oturum açık olsa bile başka kökenden gelen istek 403 alır', async ({ page }) => {
    await login(page);
    const status = await page.evaluate(async () => {
      const r = await fetch('/api/admin/taksonomi/marka', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Özel başlıksız' }),
      });
      return r.status;
    });
    expect(status).toBe(403);
    const cross = await page.request.post('/api/admin/taksonomi/marka', {
      headers: { origin: 'https://saldirgan.example', 'x-istek': 'panel' },
      data: { name: 'Başka köken' },
    });
    expect(cross.status()).toBe(403);
  });
});

test('güvenlik başlıkları ayarlı, robots.txt paneli engelliyor', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-powered-by']).toBeUndefined();
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin');
});
