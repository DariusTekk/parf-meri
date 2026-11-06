import type { NextRequest } from 'next/server';
import { deleteSession, validateSessionToken } from '@/lib/server/auth';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { assertSameOrigin, sessionCookieName, sessionCookieOptions } from '@/lib/server/request';

export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  const token = request.cookies.get(sessionCookieName())?.value;
  const admin = await validateSessionToken(token);
  await deleteSession(token);
  if (admin) await audit(admin.id, 'cikis', 'oturum', null, 'Panelden çıkış yapıldı');
  const response = apiOk({ tamam: true });
  response.cookies.set(sessionCookieName(), '', sessionCookieOptions(0));
  return response;
});
