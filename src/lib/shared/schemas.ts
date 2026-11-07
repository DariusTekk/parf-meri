import { z } from 'zod';
import {
  CONCENTRATIONS,
  GENDERS,
  PERFUME_STATUSES,
  SORT_OPTIONS,
  STOCK_STATUSES,
  type SortKey,
} from './domain';
import { SLUG_PATTERN } from './text';

const trimmed = (max: number) => z.string().trim().max(max, `En fazla ${max} karakter olabilir.`);

const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : null));

export const variantSchema = z.object({
  volumeMl: z.coerce
    .number({ message: 'Hacim sayı olmalıdır.' })
    .int('Hacim tam sayı olmalıdır.')
    .min(1, 'Hacim en az 1 ml olmalıdır.')
    .max(5000, 'Hacim en fazla 5000 ml olabilir.'),
  priceKurus: z
    .number()
    .int()
    .min(0, 'Fiyat negatif olamaz.')
    // PostgreSQL integer sınırı (2^31) içinde kalır: en fazla 20.000.000,00 TL.
    .max(2_000_000_000, 'Fiyat çok yüksek.')
    .nullable(),
});

const noteList = z
  .array(trimmed(60).min(1))
  .max(30, 'Bir katmanda en fazla 30 nota olabilir.')
  .default([]);

export const perfumeInputSchema = z.object({
  name: trimmed(160).min(2, 'Parfüm adı en az 2 karakter olmalıdır.'),
  slug: z
    .string()
    .trim()
    .max(80, 'Kısa ad en fazla 80 karakter olabilir.')
    .refine((v) => v === '' || SLUG_PATTERN.test(v), {
      message: 'Kısa ad yalnızca küçük harf, rakam ve tire içerebilir.',
    })
    .default(''),
  brandId: z.coerce.number().int().positive('Marka seçin.'),
  familyId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  description: trimmed(10_000).min(10, 'Açıklama en az 10 karakter olmalıdır.'),
  concentration: z.enum(CONCENTRATIONS, { message: 'Konsantrasyon seçin.' }),
  gender: z
    .enum(GENDERS)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  stockStatus: z.enum(STOCK_STATUSES, { message: 'Stok durumu seçin.' }),
  status: z.enum(PERFUME_STATUSES),
  isFeatured: z.boolean().default(false),
  allergens: optionalText(2000),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  notes: z
    .object({ top: noteList, heart: noteList, base: noteList })
    .default({ top: [], heart: [], base: [] }),
  variants: z.array(variantSchema).max(10, 'En fazla 10 hacim seçeneği eklenebilir.').default([]),
});
export type PerfumeInput = z.infer<typeof perfumeInputSchema>;

export const perfumeUpdateSchema = perfumeInputSchema.extend({
  updatedAt: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(200),
  password: z.string().min(1, 'Parolanızı girin.').max(200),
});

export const passwordSchema = z
  .string()
  .min(12, 'Parola en az 12 karakter olmalıdır.')
  .max(200, 'Parola en fazla 200 karakter olabilir.');

export const contactSchema = z.object({
  name: trimmed(100).min(2, 'Adınızı yazın.'),
  contact: trimmed(120)
    .min(5, 'E-posta adresinizi ya da telefon numaranızı yazın.')
    .refine(
      (v) => z.string().email().safeParse(v).success || /^[+()\d\s-]{10,20}$/.test(v),
      'Geçerli bir e-posta adresi ya da telefon numarası yazın.',
    ),
  message: trimmed(2000).min(10, 'Mesajınız en az 10 karakter olmalıdır.'),
  perfumeSlug: z.string().trim().max(80).optional(),
  website: z.string().max(200).optional(),
});

export const taxonomySchema = z.object({
  name: trimmed(80).min(2, 'Ad en az 2 karakter olmalıdır.'),
  description: optionalText(2000),
});

export const imagePatchSchema = z.object({
  altText: trimmed(200).optional(),
  isCover: z.literal(true).optional(),
});

export const imageOrderSchema = z.object({
  order: z.array(z.string().uuid()).min(1).max(8),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  status: z.enum(PERFUME_STATUSES),
});

const phoneDigits = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === '' || /^\d{10,15}$/.test(v), {
    message: 'Ülke koduyla birlikte yalnızca rakam yazın, örneğin 905551112233.',
  });

export const settingsSchema = z.object({
  siteName: trimmed(60).min(2, 'Site adı en az 2 karakter olmalıdır.'),
  tagline: trimmed(160).min(5, 'Değer önerisi en az 5 karakter olmalıdır.'),
  heroText: trimmed(400),
  aboutText: trimmed(10_000),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Geçerli bir e-posta adresi yazın.',
    }),
  phone: trimmed(30),
  whatsapp: phoneDigits,
  address: trimmed(300),
  workingHours: trimmed(200),
  instagramUrl: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || /^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/.test(v), {
      message: 'Instagram adresi https://instagram.com/kullaniciadi biçiminde olmalıdır.',
    }),
  dataControllerName: trimmed(200),
});
export type SiteSettings = z.infer<typeof settingsSchema>;

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  marka: z.string().trim().max(80).optional().catch(undefined),
  aile: z.string().trim().max(80).optional().catch(undefined),
  nota: z.string().trim().max(80).optional().catch(undefined),
  konsantrasyon: z.enum(CONCENTRATIONS).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  sirala: z
    .enum(Object.keys(SORT_OPTIONS) as [SortKey, ...SortKey[]])
    .optional()
    .catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

/** Zod hatalarını alan yolu → ilk mesaj sözlüğüne çevirir. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
