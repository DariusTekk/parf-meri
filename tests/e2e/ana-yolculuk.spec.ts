import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { imageFile, login } from './helpers';

test('yönetici parfüm ekler, görsel yükler, yayınlar; ziyaretçi 60 sn içinde görür', async ({
  page,
  browser,
}) => {
  await login(page);
  await page.goto('/admin/parfumler/yeni');
  await page.getByLabel('Parfüm adı').fill('Uçtan Uca Şebboy');
  await page.getByLabel('Marka').selectOption({ label: 'Lunavera' });
  await page.getByLabel('Koku ailesi').selectOption({ label: 'Çiçeksi' });
  await page.locator('#pf-description').fill('Uçtan uca testte yazılan **açıklama** metni.');
  await page.getByLabel('Üst notalar').fill('Bergamot, Şebboy');
  await page.getByLabel('1. hacim (ml)').fill('50');
  await page.getByLabel('1. fiyat (₺)').fill('1.250,00');
  await page.getByRole('button', { name: 'Taslak olarak oluştur' }).click();
  await expect(page.getByText('Taslak oluşturuldu')).toBeVisible();
  const editUrl = page.url();

  // Taslak ziyaretçiye görünmez.
  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  expect((await v.goto('/parfum/uctan-uca-sebboy'))?.status()).toBe(404);

  await page.locator('#gorsel-sec').setInputFiles([await imageFile('sebboy.png')]);
  await expect(page.getByText('1 görsel yüklendi')).toBeVisible();
  const alt = page.getByLabel('Alternatif metin (zorunlu)');
  await alt.fill('Mor tonlarda deneme şişesi');
  await alt.blur();
  await expect(page.getByText('Kaydedildi.', { exact: true })).toBeVisible();

  // Taslak görselin adresi ziyaretçiye 404 döner.
  const imgSrc = await page.locator('.image-item img').first().getAttribute('src');
  expect(imgSrc).toMatch(/^\/gorsel\//);
  expect((await v.request.get(imgSrc!)).status()).toBe(404);
  expect((await page.request.get(imgSrc!)).status()).toBe(200);

  await page.getByLabel('Yayında').check();
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByText('Değişiklikler vitrinde yayında.')).toBeVisible();

  let elapsed = -1;
  for (let i = 0; i < 600; i += 1) {
    const res = await v.goto('/parfum/uctan-uca-sebboy');
    if (res?.status() === 200) {
      elapsed = Date.now() - t0;
      break;
    }
    await v.waitForTimeout(100);
  }
  expect(elapsed).toBeGreaterThanOrEqual(0);
  expect(elapsed).toBeLessThan(60_000);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/yayin-suresi.json', JSON.stringify({ ms: elapsed }));

  await expect(v.getByRole('heading', { level: 1, name: 'Uçtan Uca Şebboy' })).toBeVisible();
  await expect(v.getByText('1.250,00 ₺').first()).toBeVisible();
  // Açıklama görsellerin altında.
  const galleryBox = await v.locator('.detail-gallery').boundingBox();
  const descBox = await v.locator('.detail-desc').boundingBox();
  expect(descBox!.y).toBeGreaterThan(galleryBox!.y + galleryBox!.height - 1);
  await expect(v.locator('.detail-desc strong')).toHaveText('açıklama');
  expect((await v.request.get(imgSrc!)).status()).toBe(200);

  // Katalogda, Türkçe aramada ve sitemap'te görünür.
  await v.goto('/parfumler?q=ŞEBBOY');
  await expect(v.getByRole('link', { name: 'Uçtan Uca Şebboy' })).toBeVisible();
  await v.goto('/parfumler?q=sebboy');
  await expect(v.getByRole('link', { name: 'Uçtan Uca Şebboy' })).toBeVisible();
  expect(await (await v.request.get('/sitemap.xml')).text()).toContain('/parfum/uctan-uca-sebboy');
  expect(await (await v.request.get('/sitemap.xml')).text()).not.toContain('lokum-aksami');

  // Silinince vitrinden kalkar, geri alınınca döner.
  await page.goto('/admin/parfumler?q=sebboy');
  await page.getByRole('button', { name: 'Sil: Uçtan Uca Şebboy' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
  await expect(page.getByText('silindi')).toBeVisible();
  expect((await v.goto('/parfum/uctan-uca-sebboy'))?.status()).toBe(404);
  expect((await v.request.get(imgSrc!)).status()).toBe(404);
  await page.getByRole('button', { name: 'Geri al' }).first().click();
  await expect(page.getByText('Parfüm geri alındı.')).toBeVisible();
  expect((await v.goto('/parfum/uctan-uca-sebboy'))?.status()).toBe(200);
  expect(editUrl).toMatch(/\/admin\/parfumler\/\d+/);
  await visitor.close();
});

test('ziyaretçi girişsiz ve çerez onayı olmadan kataloğu görür, çerez almaz', async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Koleksiyonu keşfet' })).toBeVisible();
  await page.getByRole('link', { name: 'Koleksiyonu keşfet' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Parfümler' })).toBeVisible();
  await expect(page.locator('.pcard').first()).toBeVisible();
  expect(await ctx.cookies()).toEqual([]);
  await ctx.close();
});
