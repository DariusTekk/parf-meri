import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import { HttpError } from './http';
import { fieldErrors } from '@/lib/shared/schemas';

export async function parseJson<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  const body: unknown = await request.json().catch(() => {
    throw new HttpError('gecersiz', 'İstek gövdesi okunamadı.');
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(
      'gecersiz',
      'Formda düzeltilmesi gereken alanlar var.',
      fieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError('bulunamadi', 'Kayıt bulunamadı.');
  return id;
}
