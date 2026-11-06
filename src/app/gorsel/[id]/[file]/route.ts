import fs from 'node:fs/promises';
import type { NextRequest } from 'next/server';
import { validateSessionToken } from '@/lib/server/auth';
import { IMAGE_FILE_PATTERN, imageAccess, imageFilePath } from '@/lib/server/images';
import { sessionCookieName } from '@/lib/server/request';

export const dynamic = 'force-dynamic';

function notFound() {
  return new Response('Bulunamadı', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * Görsel sunumu. Yayındaki ve silinmemiş parfümün görseli herkese açıktır; taslak ya da
 * silinmiş parfümün görseli yalnızca yönetici oturumuyla (önizleme) sunulur, diğer
 * isteklere 404 döner.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await ctx.params;
  const full = imageFilePath(id, file);
  const match = IMAGE_FILE_PATTERN.exec(file);
  if (!full || !match) return notFound();

  const { access, widths } = await imageAccess(id);
  if (access === 'missing' || !widths.includes(Number(match[1]))) return notFound();
  if (access === 'admin-only') {
    const admin = await validateSessionToken(request.cookies.get(sessionCookieName())?.value);
    if (!admin) return notFound();
  }

  let body: Buffer;
  try {
    body = await fs.readFile(full);
  } catch {
    return notFound();
  }
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': match[2] === 'avif' ? 'image/avif' : 'image/webp',
      'Content-Length': String(body.length),
      'Cache-Control': access === 'public' ? 'public, max-age=604800' : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
