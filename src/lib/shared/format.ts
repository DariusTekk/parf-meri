const TIME_ZONE = 'Europe/Istanbul';

const numberFormat = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Kuruş cinsinden tutarı "1.250,00 ₺" biçiminde yazar. */
export function formatPrice(kurus: number): string {
  return `${numberFormat.format(kurus / 100)} ₺`;
}

/**
 * Panelde girilen fiyatı kuruşa çevirir. "1.250,00", "1250,5", "1250" ve "1250.50"
 * kabul edilir. Boş girdi null döner; geçersiz girdi undefined döner.
 */
export function parsePriceInput(input: string): number | null | undefined {
  const raw = input.replace(/\s|₺|TL/gi, '').trim();
  if (raw === '') return null;
  let normalized: string;
  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '');
  } else {
    normalized = raw;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const value = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(value) || value < 0) return undefined;
  return value;
}

/** Panel formunda gösterim için kuruşu "1250,00" biçimine çevirir. */
export function priceToInput(kurus: number | null): string {
  if (kurus === null) return '';
  return (kurus / 100).toFixed(2).replace('.', ',');
}

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const dateTimeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

/** UTC ISO zamanı "6 Kasım 2026" biçiminde, İstanbul saatine göre yazar. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function nowIso(): string {
  return new Date().toISOString();
}
