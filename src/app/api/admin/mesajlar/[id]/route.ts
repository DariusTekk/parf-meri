import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { audit } from '@/lib/server/audit';
import { deleteMessage, markMessageRead } from '@/lib/server/contact';
import { apiOk, handle } from '@/lib/server/http';
import { requireAdminApi } from '@/lib/server/request';
import { parseId, parseJson } from '@/lib/server/route-helpers';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request: NextRequest, ctx: Ctx) => {
  await requireAdminApi(request);
  const id = parseId((await ctx.params).id);
  const { read } = await parseJson(request, z.object({ read: z.boolean() }));
  await markMessageRead(id, read);
  return apiOk({ tamam: true });
});

export const DELETE = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const id = parseId((await ctx.params).id);
  await deleteMessage(id);
  await audit(admin.id, 'sil', 'mesaj', id, 'İletişim mesajı silindi');
  return apiOk({ tamam: true });
});
