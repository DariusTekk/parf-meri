import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

const results: Array<{
  page: string;
  scheme: string;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  ids: string[];
}> = [];

async function audit(page: Page, name: string, scheme: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const count = (impact: string) => r.violations.filter((v) => v.impact === impact).length;
  results.push({
    page: name,
    scheme,
    critical: count('critical'),
    serious: count('serious'),
    moderate: count('moderate'),
    minor: count('minor'),
    ids: r.violations.map((v) => `${v.id}(${v.impact})`),
  });
  const blocking = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(
    blocking.map(
      (v) =>
        `${v.id}: ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(', ')}`,
    ),
    name,
  ).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe-core (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test('vitrin sayfaları', async ({ page }) => {
      for (const [name, url] of [
        ['Ana sayfa', '/'],
        ['Katalog', '/parfumler'],
        ['Ürün detayı', '/parfum/gece-kehribari'],
        ['İletişim', '/iletisim'],
        ['404', '/olmayan-sayfa'],
      ] as const) {
        await page.goto(url);
        await audit(page, name, scheme);
      }
    });

    test('giriş ve parfüm formu', async ({ page }) => {
      await page.goto('/admin/giris');
      await audit(page, 'Giriş', scheme);
      await login(page);
      await page.goto('/admin/parfumler/yeni');
      await audit(page, 'Parfüm formu (yeni)', scheme);
      await page.goto('/admin/parfumler?q=gece');
      await page.getByRole('link', { name: 'Gece Kehribarı' }).first().click();
      await expect(page.getByRole('heading', { name: /Görseller/ })).toBeVisible();
      await audit(page, 'Parfüm formu (düzenleme)', scheme);
    });
  });
}

test.afterAll(() => {
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/axe-sonuclari.json', JSON.stringify(results, null, 2));
});

test('klavye: atlama bağlantısı, odak görünürlüğü ve galeri ok tuşları', async ({ page }) => {
  await page.goto('/parfum/gece-kehribari');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'İçeriğe atla' });
  await expect(skip).toBeFocused();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  const thumbs = page.locator('.gallery-thumb');
  await thumbs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(thumbs.nth(1)).toBeFocused();
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current', 'true');
});

test('320 px ve %200 yakınlaştırmada yatay kaydırma yok', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const url of ['/', '/parfumler', '/parfum/gece-kehribari', '/iletisim', '/admin/giris']) {
    await page.goto(url);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
  // 640 px genişlikte %200 yakınlaştırma 320 CSS pikseline denktir.
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto('/parfumler');
  await page.evaluate(() => {
    document.body.style.zoom = '2';
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
