import type { NextRequest } from 'next/server';
import { attemptLogin, SESSION_ABSOLUTE_MS } from '@/lib/server/auth';
import { audit } from '@/lib/server/audit';
import { HttpError, apiOk, handle } from '@/lib/server/http';
import {
  assertSameOrigin,
  clientIp,
  sessionCookieName,
  sessionCookieOptions,
} from '@/lib/server/request';
import { fieldErrors, loginSchema } from '@/lib/shared/schemas';

export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(
      'gecersiz',
      'E-posta ve parolanızı kontrol edin.',
      fieldErrors(parsed.error),
    );
  }
  const result = await attemptLogin(parsed.data.email, parsed.data.password, await clientIp());
  if (!result.ok) {
    // Kişisel veri yazılmaz: e-posta ya da IP kaydedilmez, yalnızca olay ve neden.
    await audit(
      null,
      'giris_basarisiz',
      'oturum',
      null,
      `Başarısız giriş denemesi (${result.reason === 'invalid' ? 'hatalı bilgi' : result.reason === 'locked' ? 'kilitli' : 'hız sınırı'})`,
    );
    if (result.reason === 'locked') {
      throw new HttpError(
        'cok_fazla_istek',
        'Çok fazla hatalı deneme yapıldı. Güvenliğiniz için 15 dakika bekleyip tekrar deneyin.',
      );
    }
    if (result.reason === 'rate') {
      throw new HttpError(
        'cok_fazla_istek',
        'Kısa sürede çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin.',
      );
    }
    throw new HttpError('yetkisiz', 'E-posta adresi ya da parola hatalı.');
  }
  await audit(result.adminId, 'giris', 'oturum', null, 'Panele giriş yapıldı');
  const response = apiOk({ tamam: true });
  response.cookies.set(
    sessionCookieName(),
    result.token,
    sessionCookieOptions(SESSION_ABSOLUTE_MS / 1000),
  );
  return response;
});
