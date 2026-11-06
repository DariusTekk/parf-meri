import { HttpError } from './http';

export const KINDS = { marka: 'brand', 'koku-ailesi': 'family', nota: 'note' } as const;
export const KIND_LABELS = { brand: 'Marka', family: 'Koku ailesi', note: 'Nota' } as const;

export function parseKind(raw: string) {
  const kind = KINDS[raw as keyof typeof KINDS];
  if (!kind) throw new HttpError('bulunamadi', 'Bilinmeyen kayıt türü.');
  return kind;
}
