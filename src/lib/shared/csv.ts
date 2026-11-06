/**
 * Excel'in Türkçe yerel ayarıyla açılabilen CSV: UTF-8 BOM, noktalı virgül ayırıcı.
 * Formül enjeksiyonuna karşı =, +, -, @ ve sekmeyle başlayan hücrelerin başına ' eklenir.
 */
export function toCsv(rows: Array<Array<string | number>>): string {
  const cell = (value: string | number) => {
    let s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
}
