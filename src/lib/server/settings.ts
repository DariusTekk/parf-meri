import { cache } from 'react';
import { getDb } from './db';
import { nowIso } from '@/lib/shared/format';
import { settingsSchema, type SiteSettings } from '@/lib/shared/schemas';
import { siteDefaults } from '@/config/site';

/** Aynı istek içindeki tekrar çağrılar tek sorguya indirgenir. */
export const getSettings = cache(loadSettings);

async function loadSettings(): Promise<SiteSettings> {
  const row = await getDb()
    .selectFrom('site_settings')
    .select('value_json')
    .where('key', '=', 'site')
    .executeTakeFirst();
  if (!row) return siteDefaults;
  try {
    const parsed = settingsSchema.partial().safeParse(JSON.parse(row.value_json));
    return parsed.success ? { ...siteDefaults, ...parsed.data } : siteDefaults;
  } catch {
    return siteDefaults;
  }
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  const value = JSON.stringify(settings);
  const iso = nowIso();
  await getDb()
    .insertInto('site_settings')
    .values({ key: 'site', value_json: value, updated_at: iso })
    .onConflict((oc) => oc.column('key').doUpdateSet({ value_json: value, updated_at: iso }))
    .execute();
}
