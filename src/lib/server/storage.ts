import fs from 'node:fs/promises';
import path from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import { getEnv } from './env';

export type StoredFile = { name: string; data: Buffer; contentType: string };

/**
 * Görsel dosyalarının saklandığı yer. Vercel'de özel (private) Blob deposu, yerelde disk.
 * Dosyalar hiçbir zaman doğrudan herkese açık adresle sunulmaz; /gorsel rotası erişim
 * denetimi yapıp içeriği bu katmandan okur.
 */
export interface ImageStorage {
  kind: 'blob' | 'disk';
  /** Bir görselin tüm türevlerini yazar; yarıda kalırsa yazılanlar silinir. */
  write(id: string, files: StoredFile[]): Promise<void>;
  read(id: string, name: string): Promise<Buffer | null>;
  remove(id: string): Promise<void>;
  /** Depodaki görsel klasörleri ve en son değişiklik zamanı (yetim temizliği için). */
  listIds(): Promise<Array<{ id: string; modifiedAt: number }>>;
}

const BLOB_PREFIX = 'gorseller/';

function blobStorage(token: string): ImageStorage {
  const opts = { token };
  return {
    kind: 'blob',
    async write(id, files) {
      try {
        for (const f of files) {
          await put(`${BLOB_PREFIX}${id}/${f.name}`, f.data, {
            ...opts,
            access: 'private',
            contentType: f.contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
          });
        }
      } catch (error) {
        await this.remove(id);
        throw error;
      }
    },
    async read(id, name) {
      const result = await get(`${BLOB_PREFIX}${id}/${name}`, { ...opts, access: 'private' });
      if (!result || result.statusCode !== 200) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    },
    async remove(id) {
      let cursor: string | undefined;
      do {
        const page = await list({ ...opts, prefix: `${BLOB_PREFIX}${id}/`, cursor });
        if (page.blobs.length > 0)
          await del(
            page.blobs.map((b) => b.url),
            opts,
          );
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    },
    async listIds() {
      const latest = new Map<string, number>();
      let cursor: string | undefined;
      do {
        const page = await list({ ...opts, prefix: BLOB_PREFIX, cursor });
        for (const b of page.blobs) {
          const id = b.pathname.slice(BLOB_PREFIX.length).split('/')[0];
          if (!id) continue;
          latest.set(id, Math.max(latest.get(id) ?? 0, b.uploadedAt.getTime()));
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return [...latest].map(([id, modifiedAt]) => ({ id, modifiedAt }));
    },
  };
}

function diskStorage(root: string): ImageStorage {
  return {
    kind: 'disk',
    async write(id, files) {
      // Önce geçici klasöre yazılır, tamamı bitince tek adımda yerine taşınır.
      const tmpDir = path.join(/*turbopackIgnore: true*/ root, 'tmp', id);
      const finalDir = path.join(/*turbopackIgnore: true*/ root, id);
      try {
        await fs.mkdir(tmpDir, { recursive: true });
        for (const f of files) await fs.writeFile(path.join(tmpDir, f.name), f.data);
        await fs.rename(tmpDir, finalDir);
      } catch (error) {
        await fs.rm(tmpDir, { recursive: true, force: true });
        await fs.rm(finalDir, { recursive: true, force: true });
        throw error;
      }
    },
    async read(id, name) {
      try {
        return await fs.readFile(path.join(/*turbopackIgnore: true*/ root, id, name));
      } catch {
        return null;
      }
    },
    async remove(id) {
      await fs.rm(path.join(/*turbopackIgnore: true*/ root, id), { recursive: true, force: true });
    },
    async listIds() {
      const out: Array<{ id: string; modifiedAt: number }> = [];
      for (const base of [root, path.join(/*turbopackIgnore: true*/ root, 'tmp')]) {
        let entries: string[] = [];
        try {
          entries = await fs.readdir(/*turbopackIgnore: true*/ base);
        } catch {
          entries = [];
        }
        for (const entry of entries) {
          if (entry === 'tmp') continue;
          const stat = await fs.stat(path.join(/*turbopackIgnore: true*/ base, entry));
          out.push({ id: base === root ? entry : `tmp/${entry}`, modifiedAt: stat.mtimeMs });
        }
      }
      return out;
    },
  };
}

export function getImageStorage(): ImageStorage {
  const env = getEnv();
  return env.blobToken ? blobStorage(env.blobToken) : diskStorage(env.uploadDir);
}
