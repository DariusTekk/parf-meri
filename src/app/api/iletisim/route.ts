import type { NextRequest } from 'next/server';
import { submitContact } from '@/lib/server/contact';
import { HttpError, apiOk, handle } from '@/lib/server/http';
import { assertSameOrigin, clientIp } from '@/lib/server/request';
import { contactSchema, fieldErrors } from '@/lib/shared/schemas';

export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request, false);
  const body: unknown = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(
      'gecersiz',
      'Formda düzeltilmesi gereken alanlar var.',
      fieldErrors(parsed.error),
    );
  }
  // Bot tuzağı doluysa sessizce başarılı yanıt verilir, kayıt yapılmaz.
  if (parsed.data.website) return apiOk({ tamam: true }, 201);
  await submitContact(parsed.data, await clientIp());
  return apiOk({ tamam: true }, 201);
});
