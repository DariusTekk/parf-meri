import { describe, expect, it } from 'vitest';
import { toCsv } from '@/lib/shared/csv';
import { formatDate, formatPrice, parsePriceInput, priceToInput } from '@/lib/shared/format';
import { markdownToPlain, renderMarkdown } from '@/lib/shared/markdown';
import { contactSchema, perfumeInputSchema, settingsSchema } from '@/lib/shared/schemas';
import { escapeLike, foldTr, searchTokens, slugify } from '@/lib/shared/text';
import { whatsappUrl } from '@/lib/shared/whatsapp';

describe('Türkçe metin işlemleri', () => {
  it('İstanbul ve istanbul aynı katlanmış biçimi verir', () => {
    expect(foldTr('İstanbul')).toBe('istanbul');
    expect(foldTr('ISTANBUL')).toBe(foldTr('istanbul'));
    expect(foldTr('İSTANBUL')).toBe('istanbul');
  });

  it('ç, ğ, ı, ö, ş, ü harflerini katlar', () => {
    expect(foldTr('Çiçek Ğüzel Işık Öykü Şeker Ünlü')).toBe('cicek guzel isik oyku seker unlu');
  });

  it('slug Türkçe karakterleri doğru çevirir', () => {
    expect(slugify('Gece Kehribarı & Iğdır Çiçeği')).toBe('gece-kehribari-igdir-cicegi');
    expect(slugify('  ---  ')).toBe('');
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it('arama sözcüklerini ayırır ve LIKE jokerlerini kaçırır', () => {
    expect(searchTokens('  Nar   ÇİÇEĞİ ')).toEqual(['nar', 'cicegi']);
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });
});

describe('Biçimler', () => {
  it('fiyatı "1.250,00 ₺" biçiminde yazar', () => {
    expect(formatPrice(125000)).toBe('1.250,00 ₺');
    expect(formatPrice(0)).toBe('0,00 ₺');
  });

  it('panel fiyat girdisini kuruşa çevirir', () => {
    expect(parsePriceInput('1.250,00')).toBe(125000);
    expect(parsePriceInput('1250,5')).toBe(125050);
    expect(parsePriceInput('1250')).toBe(125000);
    expect(parsePriceInput('1250.50')).toBe(125050);
    expect(parsePriceInput('1.250')).toBe(125000);
    expect(parsePriceInput('1.250.000,99 ₺')).toBe(125000099);
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('abc')).toBeUndefined();
    expect(parsePriceInput('-5')).toBeUndefined();
    expect(parsePriceInput('1,234')).toBeUndefined();
    expect(priceToInput(125050)).toBe('1250,50');
    expect(priceToInput(null)).toBe('');
  });

  it('tarihi İstanbul saatine göre "6 Kasım 2026" biçiminde yazar', () => {
    expect(formatDate('2026-11-06T09:00:00.000Z')).toBe('6 Kasım 2026');
    expect(formatDate('2026-11-05T22:30:00.000Z')).toBe('6 Kasım 2026');
  });
});

describe('Markdown temizleme (XSS)', () => {
  it('ham HTML kaçırılır', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('javascript: ve data: bağlantıları üretilmez', () => {
    const html = renderMarkdown(
      '[a](javascript:alert(1)) [b](data:text/html;base64,xx) [c](https://ornek.test)',
    );
    expect(html).not.toMatch(/href="javascript/i);
    expect(html).not.toMatch(/href="data/i);
    expect(html).toContain('href="https://ornek.test"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });

  it('başlıklar h3 ve altından başlar, görsel sözdizimi kapalıdır', () => {
    expect(renderMarkdown('# Başlık')).toContain('<h3>');
    expect(renderMarkdown('![x](https://ornek.test/a.png)')).not.toContain('<img');
  });

  it('düz metin özeti üretir', () => {
    expect(markdownToPlain('**Kalın** ve [bağlantı](https://x.test)')).toBe('Kalın ve bağlantı');
    expect(markdownToPlain('kelime '.repeat(100), 50).length).toBeLessThanOrEqual(50);
  });
});

describe('Şemalar', () => {
  const valid = {
    name: 'Deneme',
    brandId: 1,
    description: 'Yeterince uzun bir açıklama.',
    concentration: 'EDP',
    stockStatus: 'in_stock',
    status: 'draft',
  };

  it('geçerli parfüm girdisini kabul eder ve varsayılanları doldurur', () => {
    const r = perfumeInputSchema.parse(valid);
    expect(r.notes).toEqual({ top: [], heart: [], base: [] });
    expect(r.familyId).toBeNull();
    expect(r.allergens).toBeNull();
  });

  it('eksik alanlarda Türkçe hata verir', () => {
    const r = perfumeInputSchema.safeParse({ ...valid, name: 'a', slug: 'Büyük Harf' });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toContain('Parfüm adı en az 2 karakter olmalıdır.');
    expect(messages).toContain('Kısa ad yalnızca küçük harf, rakam ve tire içerebilir.');
  });

  it('iletişim formu e-posta ya da telefon kabul eder', () => {
    const base = { name: 'Ayşe', message: 'Bilgi almak istiyorum.' };
    expect(contactSchema.safeParse({ ...base, contact: 'ayse@ornek.test' }).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, contact: '0555 111 22 33' }).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, contact: 'yanlış' }).success).toBe(false);
  });

  it('ayarlarda WhatsApp ve Instagram biçimini denetler', () => {
    const s = {
      siteName: 'Site',
      tagline: 'Değer önerisi',
      heroText: '',
      aboutText: '',
      email: '',
      phone: '',
      whatsapp: '0555',
      address: '',
      workingHours: '',
      instagramUrl: 'http://kotu.test',
      dataControllerName: '',
    };
    const r = settingsSchema.safeParse(s);
    expect(r.success).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...s,
        whatsapp: '905551112233',
        instagramUrl: 'https://instagram.com/nota',
      }).success,
    ).toBe(true);
  });
});

describe('Yardımcılar', () => {
  it('CSV formül enjeksiyonunu engeller ve noktalı virgülle ayırır', () => {
    const csv = toCsv([['a;b', '=1+1', 'düz', 5]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"a;b"');
    expect(csv).toContain("'=1+1");
  });

  it('WhatsApp bağlantısı yalnızca geçerli numarayla üretilir', () => {
    expect(whatsappUrl('', 'x')).toBeNull();
    expect(whatsappUrl('+90 555 111 22 33', 'Merhaba ç')).toBe(
      'https://wa.me/905551112233?text=Merhaba%20%C3%A7',
    );
  });
});
