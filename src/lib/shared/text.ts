/** Türkçe kurallarıyla küçük harfe çevirir: "İ" → "i", "I" → "ı". */
export function trLower(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

/**
 * Arama ve sıralama için katlanmış biçim: Türkçe küçük harf, aksanlar ve ı/i farkı
 * kaldırılır, harf ve rakam dışındaki karakterler tek boşluğa indirgenir.
 * "İstanbul", "istanbul" ve "ISTANBUL" aynı sonucu verir; "çiçek" ile "cicek" de öyle.
 */
export function foldTr(value: string): string {
  return trLower(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(value: string): string {
  return foldTr(value).replace(/ /g, '-').slice(0, 80).replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** LIKE sorgusunda joker karakterleri kaçırır (ESCAPE '\' ile kullanılır). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function searchTokens(query: string): string[] {
  return foldTr(query)
    .split(' ')
    .filter((t) => t.length > 0)
    .slice(0, 8);
}
