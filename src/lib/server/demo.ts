import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getDb } from './db';
import { addImage, uploadRoot } from './images';
import { savePerfume, setStatusBulk } from './perfumes';
import { uniqueSlug } from './taxonomy';
import { nowIso } from '@/lib/shared/format';
import type { Concentration, NoteTier, StockStatus } from '@/lib/shared/domain';
import { foldTr } from '@/lib/shared/text';

type DemoPerfume = {
  name: string;
  brand: number;
  family: string;
  concentration: Concentration;
  gender: 'kadin' | 'erkek' | 'unisex';
  stock: StockStatus;
  notes: Record<NoteTier, string[]>;
  variants: Array<[number, number | null]>;
  hue: number;
  featured?: boolean;
  draft?: boolean;
  description: string;
  images?: number;
};

const BRANDS = [
  {
    name: 'Lunavera',
    description:
      'Gece ve ay ışığından ilham alan, yumuşak ve sıcak kokular hazırlayan hayali bir atölye.',
  },
  {
    name: 'Mavikıyı Parfüm',
    description:
      'Ege kıyılarının tuzlu havasını, narenciye bahçelerini ve çam ormanlarını şişeye taşıyan hayali bir marka.',
  },
  {
    name: 'Nar Atölyesi',
    description:
      'Baharat yolundan gelen notaları modern bir dille yorumlayan hayali bir parfüm evi.',
  },
];

const P: DemoPerfume[] = [
  {
    name: 'Gece Kehribarı',
    brand: 0,
    family: 'Amber (oryantal)',
    concentration: 'EDP',
    gender: 'unisex',
    stock: 'in_stock',
    hue: 32,
    featured: true,
    images: 2,
    notes: {
      top: ['Bergamot', 'Pembe biber'],
      heart: ['Labdanum', 'Tarçın'],
      base: ['Kehribar', 'Vanilya', 'Sandal ağacı'],
    },
    variants: [
      [50, 245000],
      [100, 365000],
    ],
    description:
      'Akşam saatleri için sıcak ve yoğun bir kehribar kokusu. Açılışta bergamotun parlaklığı pembe biberle birleşir; zamanla labdanum ve tarçının reçineli dokusu öne çıkar.\n\n### Nasıl kullanılır\n- Bilek ve boyun bölgesine iki ya da üç fıs\n- Serin havalarda ve akşam davetlerinde',
  },
  {
    name: 'Ay Işığı Süeti',
    brand: 0,
    family: 'Deri',
    concentration: 'PARFUM',
    gender: 'unisex',
    stock: 'low',
    hue: 280,
    images: 1,
    notes: { top: ['Safran'], heart: ['Süet', 'İris'], base: ['Misk', 'Kaşmir ağacı'] },
    variants: [[50, 412500]],
    description:
      'Safranın hafif metalik açılışını yumuşak bir süet akoru izler. İris pudralı bir derinlik katar; dip notalarda misk ten kokusuna yakın bir sıcaklık bırakır.',
  },
  {
    name: 'Beyaz Gece',
    brand: 0,
    family: 'Çiçeksi',
    concentration: 'EDP',
    gender: 'kadin',
    stock: 'in_stock',
    hue: 330,
    featured: true,
    images: 2,
    notes: {
      top: ['Armut', 'Mandalina'],
      heart: ['Yasemin', 'Sümbülteber'],
      base: ['Misk', 'Sedir'],
    },
    variants: [
      [30, 145000],
      [50, 198000],
      [100, 289000],
    ],
    description:
      'Beyaz çiçeklerin kremamsı tarafını öne çıkaran bir koku. Yasemin ve sümbülteber, armudun sulu tatlılığıyla dengelenir.',
  },
  {
    name: 'Yıldız Tozu',
    brand: 0,
    family: 'Gurme',
    concentration: 'EDT',
    gender: 'kadin',
    stock: 'in_stock',
    hue: 300,
    images: 1,
    notes: {
      top: ['Ahududu'],
      heart: ['Pralin', 'Portakal çiçeği'],
      base: ['Tonka fasulyesi', 'Vanilya'],
    },
    variants: [
      [50, 132000],
      [100, 185000],
    ],
    description:
      'Pralin ve ahududunun tatlı, oyuncu birleşimi. Gündüz kullanımına uygun, hafif bir gurme yorum.',
  },
  {
    name: 'Selvi Gölgesi',
    brand: 0,
    family: 'Odunsu',
    concentration: 'EDP',
    gender: 'erkek',
    stock: 'out',
    hue: 140,
    images: 1,
    notes: { top: ['Ardıç'], heart: ['Selvi', 'Vetiver'], base: ['Sedir', 'Paçuli'] },
    variants: [[100, null]],
    description:
      'Selvi ve ardıcın yeşil, reçineli havası. Vetiver ve sedir kuru, temiz bir odunsu iz bırakır.',
  },
  {
    name: 'Ege Rüzgârı',
    brand: 1,
    family: 'Su ve deniz',
    concentration: 'EDT',
    gender: 'unisex',
    stock: 'in_stock',
    hue: 195,
    featured: true,
    images: 2,
    notes: {
      top: ['Deniz tuzu', 'Limon'],
      heart: ['Biberiye', 'Adaçayı'],
      base: ['Ambergris akoru', 'Yosun'],
    },
    variants: [
      [50, 115000],
      [100, 168000],
    ],
    description:
      'Sabah saatlerinde kıyıda esen rüzgârı anımsatan ferah bir koku. Deniz tuzu ve limon açılışı, biberiye ve adaçayıyla aromatik bir kalbe geçer.',
  },
  {
    name: 'Limon Bahçesi',
    brand: 1,
    family: 'Narenciye',
    concentration: 'EDC',
    gender: 'unisex',
    stock: 'in_stock',
    hue: 55,
    images: 1,
    notes: { top: ['Limon', 'Bergamot', 'Petitgrain'], heart: ['Neroli'], base: ['Beyaz misk'] },
    variants: [
      [100, 89000],
      [200, 139000],
    ],
    description:
      'Sıcak yaz günleri için hafif ve canlandırıcı bir kolonya yorumu. Neroli kalbi koku boyunca narenciye tazeliğini korur.',
  },
  {
    name: 'Çam Koyu',
    brand: 1,
    family: 'Aromatik',
    concentration: 'EDP',
    gender: 'erkek',
    stock: 'preorder',
    hue: 110,
    images: 1,
    notes: {
      top: ['Çam iğnesi', 'Greyfurt'],
      heart: ['Lavanta', 'Adaçayı'],
      base: ['Sedir', 'Tütsü'],
    },
    variants: [[100, 224000]],
    description:
      'Denize inen çam ormanının reçineli, aromatik havası. Lavanta ve adaçayı temiz bir kalp, tütsü ise hafif dumanlı bir dip oluşturur.',
  },
  {
    name: 'Mavi Fujer',
    brand: 1,
    family: 'Fujer',
    concentration: 'EDT',
    gender: 'erkek',
    stock: 'in_stock',
    hue: 220,
    images: 1,
    notes: {
      top: ['Bergamot', 'Nane'],
      heart: ['Lavanta', 'Sardunya'],
      base: ['Meşe yosunu', 'Tonka fasulyesi'],
    },
    variants: [
      [50, 98000],
      [100, 142000],
    ],
    description:
      'Klasik fujer yapısının çağdaş bir yorumu: lavanta, sardunya ve meşe yosunu, nane ve bergamotla tazelenir.',
  },
  {
    name: 'Nar Çiçeği',
    brand: 2,
    family: 'Çiçeksi',
    concentration: 'EDP',
    gender: 'kadin',
    stock: 'in_stock',
    hue: 355,
    featured: true,
    images: 2,
    notes: { top: ['Nar', 'Pembe biber'], heart: ['Gül', 'Şakayık'], base: ['Misk', 'Paçuli'] },
    variants: [
      [50, 210000],
      [100, 310000],
    ],
    description:
      'Narın ekşimsi meyveliliği ile gülün kadifemsi yapısını buluşturan bir koku. Paçuli dipte toprağımsı bir derinlik verir.',
  },
  {
    name: 'Baharat Yolu',
    brand: 2,
    family: 'Amber (oryantal)',
    concentration: 'EXTRAIT',
    gender: 'unisex',
    stock: 'low',
    hue: 18,
    images: 1,
    notes: {
      top: ['Kakule', 'Karanfil'],
      heart: ['Tarçın', 'Safran'],
      base: ['Oud akoru', 'Kehribar'],
    },
    variants: [[50, 498000]],
    description:
      'Kakule, karanfil ve tarçının sıcak baharat örtüsü. Oud akoru ve kehribar uzun süren, yoğun bir iz bırakır.',
  },
  {
    name: 'İncir Avlusu',
    brand: 2,
    family: 'Şipr',
    concentration: 'EDP',
    gender: 'unisex',
    stock: 'in_stock',
    hue: 85,
    images: 1,
    notes: {
      top: ['İncir yaprağı', 'Bergamot'],
      heart: ['İncir', 'Yasemin'],
      base: ['Meşe yosunu', 'Sedir'],
    },
    variants: [
      [30, 118000],
      [100, 255000],
    ],
    description:
      'Taş bir avludaki incir ağacının gölgesi: yeşil yaprak, olgun meyve ve meşe yosununun şipr tabanı.',
  },
  {
    name: 'Lokum Akşamı',
    brand: 2,
    family: 'Gurme',
    concentration: 'EDP',
    gender: 'kadin',
    stock: 'in_stock',
    hue: 345,
    draft: true,
    images: 1,
    notes: { top: ['Gül suyu'], heart: ['Badem', 'Şeker akoru'], base: ['Vanilya', 'Misk'] },
    variants: [[50, null]],
    description:
      'Gül suyu ve bademin lokumu anımsatan tatlı birleşimi. Henüz taslak aşamasında, yayına alınmadı.',
  },
  {
    name: 'Kum Saati',
    brand: 1,
    family: 'Odunsu',
    concentration: 'PARFUM',
    gender: 'unisex',
    stock: 'in_stock',
    hue: 40,
    draft: true,
    images: 0,
    notes: { top: ['Kakule'], heart: ['Vetiver'], base: ['Sandal ağacı', 'Kehribar'] },
    variants: [[50, 330000]],
    description:
      'Kuru kum ve sıcak odunsu notalar. Görselleri henüz hazırlanmadığı için taslakta bekliyor.',
  },
];

/** Telifsiz, nötr şişe silueti SVG'si; her parfüm için farklı renk tonu. */
export function bottleSvg(hue: number, variant = 0): string {
  const bg = `hsl(${hue} 30% ${variant ? 88 : 92}%)`;
  const glass = `hsl(${hue} 55% ${variant ? 48 : 42}%)`;
  const light = `hsl(${hue} 70% 75%)`;
  const cap = variant ? '#2b2226' : '#c9a24a';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${glass}"/></linearGradient>
    <radialGradient id="s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="800" height="1000" fill="${bg}"/>
  <ellipse cx="400" cy="860" rx="230" ry="36" fill="url(#s)"/>
  <rect x="345" y="${variant ? 170 : 190}" width="110" height="${variant ? 130 : 110}" rx="14" fill="${cap}"/>
  <rect x="370" y="290" width="60" height="50" fill="${glass}" opacity="0.9"/>
  <rect x="${variant ? 230 : 210}" y="330" width="${variant ? 340 : 380}" height="520" rx="${variant ? 170 : 60}" fill="url(#g)"/>
  <rect x="${variant ? 270 : 250}" y="370" width="40" height="420" rx="20" fill="#fff" opacity="0.35"/>
  <rect x="320" y="560" width="160" height="90" rx="8" fill="#fff" opacity="0.85"/>
</svg>`;
}

export async function demoCounts() {
  const db = getDb();
  const count = async (t: 'perfumes' | 'brands' | 'fragrance_families' | 'notes') =>
    Number(
      (
        await db
          .selectFrom(t)
          .select((eb) => eb.fn.countAll<number>().as('n'))
          .where('is_demo', '=', 1)
          .executeTakeFirstOrThrow()
      ).n,
    );
  const images = Number(
    (
      await db
        .selectFrom('perfume_images')
        .innerJoin('perfumes', 'perfumes.id', 'perfume_images.perfume_id')
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .where('perfumes.is_demo', '=', 1)
        .executeTakeFirstOrThrow()
    ).n,
  );
  const published = Number(
    (
      await db
        .selectFrom('perfumes')
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .where('is_demo', '=', 1)
        .where('status', '=', 'published')
        .executeTakeFirstOrThrow()
    ).n,
  );
  return {
    perfumes: await count('perfumes'),
    published,
    drafts: (await count('perfumes')) - published,
    brands: await count('brands'),
    families: await count('fragrance_families'),
    notes: await count('notes'),
    images,
  };
}

export async function loadDemo() {
  await clearDemo();
  const db = getDb();
  const iso = nowIso();
  const brandIds: number[] = [];
  for (const b of BRANDS) {
    const slug = await uniqueSlug('brands', b.name);
    const row = await db
      .insertInto('brands')
      .values({
        name: b.name,
        slug,
        description: b.description,
        is_demo: 1,
        created_at: iso,
        updated_at: iso,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    brandIds.push(row.id);
  }

  const families = await db.selectFrom('fragrance_families').select(['id', 'name']).execute();
  const familyId = async (name: string) => {
    const found = families.find((f) => foldTr(f.name) === foldTr(name));
    if (found) return found.id;
    const slug = await uniqueSlug('fragrance_families', name);
    const row = await db
      .insertInto('fragrance_families')
      .values({ name, slug, is_demo: 1, sort_order: 999 })
      .returning('id')
      .executeTakeFirstOrThrow();
    families.push({ id: row.id, name });
    return row.id;
  };

  const existingNotes = new Set(
    (await db.selectFrom('notes').select('name').execute()).map((n) => foldTr(n.name)),
  );
  const publishIds: number[] = [];
  for (const [index, p] of P.entries()) {
    const saved = await savePerfume(
      {
        name: p.name,
        slug: '',
        brandId: brandIds[p.brand]!,
        familyId: await familyId(p.family),
        description: p.description,
        concentration: p.concentration,
        gender: p.gender,
        stockStatus: p.stock,
        status: 'draft',
        isFeatured: Boolean(p.featured),
        allergens:
          index % 3 === 0
            ? 'Bu alan örnek veridir. Gerçek ürünlerde etiketteki içerik listesi yazılmalıdır.'
            : null,
        seoTitle: null,
        seoDescription: null,
        notes: p.notes,
        variants: p.variants.map(([volumeMl, priceKurus]) => ({ volumeMl, priceKurus })),
      },
      { isDemo: true },
    );
    for (let i = 0; i < (p.images ?? 1); i += 1) {
      const png = await sharp(Buffer.from(bottleSvg(p.hue, i)))
        .png()
        .toBuffer();
      await addImage(
        saved.id,
        png,
        'image/png',
        `${BRANDS[p.brand]!.name} ${p.name} şişesi, ${i === 0 ? 'önden görünüm' : 'farklı açıdan görünüm'} (temsilî çizim)`,
      );
    }
    if (!p.draft) publishIds.push(saved.id);
  }
  const result = await setStatusBulk(publishIds, 'published');
  if (result.skipped.length > 0)
    throw new Error(`Yayınlanamayan demo kayıtları: ${result.skipped.length}`);

  // Demo yüklemesinin oluşturduğu yeni notalar da demo olarak işaretlenir.
  const allNotes = await db.selectFrom('notes').select(['id', 'name']).execute();
  const newNoteIds = allNotes.filter((n) => !existingNotes.has(foldTr(n.name))).map((n) => n.id);
  if (newNoteIds.length > 0)
    await db.updateTable('notes').set({ is_demo: 1 }).where('id', 'in', newNoteIds).execute();

  // Yayın sırası "yeni gelenler" için farklı günlere yayılır.
  const published = await db
    .selectFrom('perfumes')
    .select('id')
    .where('is_demo', '=', 1)
    .where('status', '=', 'published')
    .orderBy('id')
    .execute();
  for (const [i, row] of published.entries()) {
    const at = new Date(Date.now() - (published.length - i) * 86_400_000).toISOString();
    await db.updateTable('perfumes').set({ published_at: at }).where('id', '=', row.id).execute();
  }
  return demoCounts();
}

export async function clearDemo() {
  const db = getDb();
  const perfumes = await db.selectFrom('perfumes').select('id').where('is_demo', '=', 1).execute();
  const ids = perfumes.map((p) => p.id);
  if (ids.length > 0) {
    const images = await db
      .selectFrom('perfume_images')
      .select('id')
      .where('perfume_id', 'in', ids)
      .execute();
    await db.deleteFrom('perfumes').where('id', 'in', ids).execute();
    for (const img of images)
      await fs.rm(path.join(uploadRoot(), img.id), { recursive: true, force: true });
  }
  // Gerçek kayıtların kullandığı demo marka, aile ve notalar silinmez; gerçek kayda dönüştürülür.
  await db
    .updateTable('brands')
    .set({ is_demo: 0 })
    .where('is_demo', '=', 1)
    .where((eb) =>
      eb.exists(
        eb.selectFrom('perfumes').select('id').whereRef('perfumes.brand_id', '=', 'brands.id'),
      ),
    )
    .execute();
  await db.deleteFrom('brands').where('is_demo', '=', 1).execute();
  await db
    .updateTable('fragrance_families')
    .set({ is_demo: 0 })
    .where('is_demo', '=', 1)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('perfumes')
          .select('id')
          .whereRef('perfumes.family_id', '=', 'fragrance_families.id'),
      ),
    )
    .execute();
  await db.deleteFrom('fragrance_families').where('is_demo', '=', 1).execute();
  await db
    .updateTable('notes')
    .set({ is_demo: 0 })
    .where('is_demo', '=', 1)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('perfume_notes')
          .select('perfume_id')
          .whereRef('perfume_notes.note_id', '=', 'notes.id'),
      ),
    )
    .execute();
  await db.deleteFrom('notes').where('is_demo', '=', 1).execute();
  return demoCounts();
}
