import { expect, test } from '@playwright/test';
import { accounts, imageFile, login } from './helpers';

test.describe('Görsel sınırları', () => {
  test('9. görsel, 5 MB üstü ve sahte uzantılı dosya reddedilir', async ({ page }) => {
    await login(page);
    await page.goto('/admin/parfumler/yeni');
    await page.getByLabel('Parfüm adı').fill('Sınır Denemesi');
    await page.getByLabel('Marka').selectOption({ label: 'Nar Atölyesi' });
    await page.locator('#pf-description').fill('Görsel sınırlarını deneyen kayıt.');
    await page.getByRole('button', { name: 'Taslak olarak oluştur' }).click();
    await expect(page.getByText('Taslak oluşturuldu')).toBeVisible();
    const id = page.url().match(/parfumler\/(\d+)/)![1];

    const fake = {
      name: 'sahte.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('bu bir görsel değil'),
    };
    await page.locator('#gorsel-sec').setInputFiles([fake]);
    await expect(page.getByText('Dosyanın içeriği bu türlerden biri değil')).toBeVisible();

    // İstemci denetimi atlanarak sunucuya doğrudan gönderilen büyük dosya da reddedilir.
    const big = Buffer.concat([
      (await imageFile('b.png')).buffer,
      Buffer.alloc(5 * 1024 * 1024 + 10),
    ]);
    const bigRes = await page.request.post(`/api/admin/parfumler/${id}/gorseller`, {
      headers: { 'x-istek': 'panel', origin: 'http://localhost:3100' },
      multipart: { dosya: { name: 'buyuk.png', mimeType: 'image/png', buffer: big } },
    });
    expect(bigRes.status()).toBe(413);
    await page
      .locator('#gorsel-sec')
      .setInputFiles([{ name: 'buyuk.png', mimeType: 'image/png', buffer: big }]);
    await expect(page.getByText('Dosya 5 MB sınırını aşıyor.')).toBeVisible();

    const files = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        imageFile(`g${i}.png`, 600, 750, `#${(i + 2).toString(16).repeat(6)}`),
      ),
    );
    await page.locator('#gorsel-sec').setInputFiles(files);
    await expect(page.getByText('8 görsel yüklendi')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Görseller (8/8)' })).toBeVisible();
    await expect(page.getByText('Görsel sınırına ulaşıldı')).toBeVisible();

    const ninth = await page.request.post(`/api/admin/parfumler/${id}/gorseller`, {
      headers: { 'x-istek': 'panel', origin: 'http://localhost:3100' },
      multipart: { dosya: await imageFile('dokuz.png') },
    });
    expect(ninth.status()).toBe(422);
    expect((await ninth.json()).hata.mesaj).toContain('en fazla 8 görsel');

    // Klavyeyle sıralama: ikinci görsel yukarı taşınır.
    const before = await page.locator('.image-item img').nth(1).getAttribute('src');
    await page.getByRole('button', { name: '2. görseli yukarı taşı' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Görsel 2. sıradan 1. sıraya taşındı.')).toBeVisible();
    expect(await page.locator('.image-item img').first().getAttribute('src')).toBe(before);
  });
});

test('iki sekmede düzenleme: sonra kaydeden 409 ve Türkçe mesaj alır, girdisi kaybolmaz', async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  await login(a);
  await a.goto('/admin/parfumler?q=limon');
  await a.getByRole('link', { name: 'Limon Bahçesi' }).first().click();
  await expect(a).toHaveURL(/\/admin\/parfumler\/\d+$/);
  await expect(a.getByLabel('Parfüm adı')).toHaveValue('Limon Bahçesi');
  const url = a.url();
  const b = await ctx.newPage();
  await b.goto(url);
  await expect(b.getByLabel('Parfüm adı')).toHaveValue('Limon Bahçesi');
  await a.getByLabel('Parfüm adı').fill('Limon Bahçesi A');
  await a.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(a.getByText('Kaydedildi', { exact: true })).toBeVisible();
  await b.getByLabel('Parfüm adı').fill('Limon Bahçesi B');
  await b.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(b.getByText('Çakışma: kaydedilmedi')).toBeVisible();
  await expect(b.getByText('siz düzenlerken başka bir sekmede')).toBeVisible();
  await expect(b.getByLabel('Parfüm adı')).toHaveValue('Limon Bahçesi B');
  await ctx.close();
});

test('fiyatı olmayan parfümde "Fiyat için iletişime geçin" yazar', async ({ page }) => {
  await page.goto('/parfum/selvi-golgesi');
  await expect(page.getByText('Fiyat için iletişime geçin').first()).toBeVisible();
  await expect(page.getByText('Tükendi').first()).toBeVisible();
});

test('Türkçe arama ve boş sonuç durumu', async ({ page }) => {
  await page.goto('/parfumler?q=İNCİR');
  await expect(page.getByRole('link', { name: 'İncir Avlusu' })).toBeVisible();
  await page.goto('/parfumler?q=incir');
  await expect(page.getByRole('link', { name: 'İncir Avlusu' })).toBeVisible();
  await page.goto('/parfumler?q=olmayanbirkelime');
  await expect(page.getByText('Aradığınız ölçütlere uyan parfüm bulunamadı')).toBeVisible();
  await page.goto('/parfumler?marka=mavikiyi-parfum&sirala=fiyat-artan');
  await expect(page.getByText('Marka: Mavikıyı Parfüm')).toBeVisible();
  await page.getByText('Marka: Mavikıyı Parfüm').click();
  await expect(page).toHaveURL(/sirala=fiyat-artan/);
  await expect(page).not.toHaveURL(/marka=/);
});

test('hatalı girişler hesabı 15 dakika kilitler', async ({ page }) => {
  const { lock } = accounts();
  await page.goto('/admin/giris');
  for (let i = 0; i < 5; i += 1) {
    await page.getByLabel('E-posta').fill(lock.email);
    await page.getByLabel('Parola').fill(`yanlis-${i}`);
    const [res] = await Promise.all([
      page.waitForResponse('**/api/oturum/giris'),
      page.getByRole('button', { name: 'Giriş yap' }).click(),
    ]);
    expect(res.status()).toBe(401);
    await expect(page.getByText('E-posta adresi ya da parola hatalı.')).toBeVisible();
  }
  await page.getByLabel('Parola').fill(lock.password);
  const [locked] = await Promise.all([
    page.waitForResponse('**/api/oturum/giris'),
    page.getByRole('button', { name: 'Giriş yap' }).click(),
  ]);
  expect(locked.status()).toBe(429);
  await expect(page.getByText('Çok fazla hatalı deneme yapıldı')).toBeVisible();
});

test('oturum düşünce kaydetme 401 alır, girilen veri sayfada kalır; çıkış oturumu sonlandırır', async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto('/admin/ayarlar');
  await page.getByLabel('Çalışma saatleri').fill('Hafta içi 10.00-19.00');
  await context.clearCookies();
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Oturumunuzun süresi doldu')).toBeVisible();
  await expect(page.getByLabel('Çalışma saatleri')).toHaveValue('Hafta içi 10.00-19.00');

  await login(page);
  const cookie = (await context.cookies()).find((c) => c.name.endsWith('oturum'));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  await page.getByRole('button', { name: 'Çıkış yap' }).click();
  await expect(page).toHaveURL(/\/admin\/giris/);
  const reused = await page.request.post('/api/admin/taksonomi/marka', {
    headers: {
      cookie: `${cookie!.name}=${cookie!.value}`,
      'x-istek': 'panel',
      origin: 'http://localhost:3100',
    },
    data: { name: 'Eski oturum' },
  });
  expect(reused.status()).toBe(401);
});

test('iletişim formu hata ve başarı durumları', async ({ page }) => {
  await page.goto('/iletisim?parfum=gece-kehribari');
  await expect(page.getByText('Lunavera Gece Kehribarı', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Mesajınız').fill('');
  await page.getByRole('button', { name: 'Gönder' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'Form gönderilemedi' });
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(page.getByLabel('Adınız')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Adınız').fill('Deneme Kişi');
  await page.getByLabel('E-posta ya da telefon').fill('kisi@ornek.test');
  await page.getByLabel('Mesajınız').fill('Bu parfüm hakkında bilgi almak istiyorum.');
  await page.getByRole('button', { name: 'Gönder' }).click();
  await expect(page.getByText('Mesajınız bize ulaştı')).toBeVisible();
});

test('çevrimdışıyken favoriler hata durumu gösterir', async ({ page, context }) => {
  await page.goto('/parfum/gece-kehribari');
  await page.getByRole('button', { name: 'Favorilere ekle' }).first().click();
  await page.goto('/favoriler');
  await expect(page.getByRole('link', { name: 'Gece Kehribarı' })).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => {
    window.localStorage.setItem('favoriler', JSON.stringify(['gece-kehribari', 'ay-isigi-sueti']));
    window.dispatchEvent(new Event('favoriler-degisti'));
  });
  await expect(page.getByText('Sunucuya ulaşılamadı')).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Tekrar dene' }).click();
  await expect(page.getByRole('link', { name: 'Ay Işığı Süeti' })).toBeVisible();
});
