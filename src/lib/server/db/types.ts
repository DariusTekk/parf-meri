import type { Generated, Insertable, Selectable } from 'kysely';
import type {
  Concentration,
  Gender,
  NoteTier,
  PerfumeStatus,
  StockStatus,
} from '@/lib/shared/domain';

export interface AdminsTable {
  id: Generated<number>;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface SessionsTable {
  id: Generated<number>;
  admin_id: number;
  token_hash: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export interface RateEventsTable {
  id: Generated<number>;
  key: string;
  kind: string;
  success: number;
  created_at: string;
}

export interface BrandsTable {
  id: Generated<number>;
  name: string;
  slug: string;
  description: string | null;
  is_demo: Generated<number>;
  created_at: string;
  updated_at: string;
}

export interface FamiliesTable {
  id: Generated<number>;
  name: string;
  slug: string;
  sort_order: Generated<number>;
  is_demo: Generated<number>;
}

export interface NotesTable {
  id: Generated<number>;
  name: string;
  slug: string;
  is_demo: Generated<number>;
}

export interface PerfumesTable {
  id: Generated<number>;
  brand_id: number;
  family_id: number | null;
  name: string;
  slug: string;
  description_md: string;
  concentration: Concentration;
  gender: Gender | null;
  stock_status: StockStatus;
  status: PerfumeStatus;
  is_featured: number;
  allergens_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_text: string;
  sort_name: string;
  min_price_kurus: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_demo: Generated<number>;
}

export interface PerfumeNotesTable {
  perfume_id: number;
  note_id: number;
  tier: NoteTier;
}

export interface PerfumeVariantsTable {
  id: Generated<number>;
  perfume_id: number;
  volume_ml: number;
  price_kurus: number | null;
  sort_order: number;
}

export interface PerfumeImagesTable {
  id: string;
  perfume_id: number;
  sort_order: number;
  is_cover: number;
  alt_text: string;
  width: number;
  height: number;
  widths: string;
  created_at: string;
}

export interface SiteSettingsTable {
  key: string;
  value_json: string;
  updated_at: string;
}

export interface ContactMessagesTable {
  id: Generated<number>;
  name: string;
  contact: string;
  message: string;
  perfume_id: number | null;
  created_at: string;
  read_at: string | null;
}

export interface AuditLogTable {
  id: Generated<number>;
  admin_id: number | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
}

export interface Database {
  admins: AdminsTable;
  sessions: SessionsTable;
  rate_events: RateEventsTable;
  brands: BrandsTable;
  fragrance_families: FamiliesTable;
  notes: NotesTable;
  perfumes: PerfumesTable;
  perfume_notes: PerfumeNotesTable;
  perfume_variants: PerfumeVariantsTable;
  perfume_images: PerfumeImagesTable;
  site_settings: SiteSettingsTable;
  contact_messages: ContactMessagesTable;
  audit_log: AuditLogTable;
}

export type PerfumeRow = Selectable<PerfumesTable>;
export type NewPerfume = Insertable<PerfumesTable>;
export type ImageRow = Selectable<PerfumeImagesTable>;
