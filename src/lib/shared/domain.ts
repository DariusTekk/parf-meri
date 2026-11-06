export const CONCENTRATIONS = ['EDC', 'EDT', 'EDP', 'PARFUM', 'EXTRAIT'] as const;
export type Concentration = (typeof CONCENTRATIONS)[number];

export const CONCENTRATION_LABELS: Record<Concentration, string> = {
  EDC: 'Eau de Cologne',
  EDT: 'Eau de Toilette',
  EDP: 'Eau de Parfum',
  PARFUM: 'Parfum',
  EXTRAIT: 'Extrait de Parfum',
};

export const STOCK_STATUSES = ['in_stock', 'low', 'out', 'preorder'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: 'Stokta',
  low: 'Az kaldı',
  out: 'Tükendi',
  preorder: 'Ön sipariş',
};

export const GENDERS = ['kadin', 'erkek', 'unisex'] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  kadin: 'Kadın',
  erkek: 'Erkek',
  unisex: 'Unisex',
};

export const NOTE_TIERS = ['top', 'heart', 'base'] as const;
export type NoteTier = (typeof NOTE_TIERS)[number];

export const NOTE_TIER_LABELS: Record<NoteTier, string> = {
  top: 'Üst notalar',
  heart: 'Orta notalar',
  base: 'Alt notalar',
};

export const PERFUME_STATUSES = ['draft', 'published'] as const;
export type PerfumeStatus = (typeof PERFUME_STATUSES)[number];

export const STATUS_LABELS: Record<PerfumeStatus, string> = {
  draft: 'Taslak',
  published: 'Yayında',
};

export const IMAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxPerPerfume: 8,
  minSide: 300,
  maxPixels: 40_000_000,
  widths: [400, 800, 1600] as const,
};

export const CATALOG_PAGE_SIZE = 24;
export const ADMIN_PAGE_SIZE = 20;

export const SORT_OPTIONS = {
  yeni: 'En yeniler',
  'fiyat-artan': 'Fiyat (artan)',
  'fiyat-azalan': 'Fiyat (azalan)',
  ad: 'Ada göre (A-Z)',
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;
