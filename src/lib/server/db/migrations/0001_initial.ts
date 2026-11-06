import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('admins')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('password_hash', 'text', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('sessions')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('admin_id', 'integer', (c) =>
      c.notNull().references('admins.id').onDelete('cascade'),
    )
    .addColumn('token_hash', 'text', (c) => c.notNull().unique())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('last_seen_at', 'text', (c) => c.notNull())
    .addColumn('expires_at', 'text', (c) => c.notNull())
    .execute();
  await db.schema.createIndex('sessions_expires_idx').on('sessions').column('expires_at').execute();

  await db.schema
    .createTable('rate_events')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('key', 'text', (c) => c.notNull())
    .addColumn('kind', 'text', (c) => c.notNull())
    .addColumn('success', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute();
  await db.schema
    .createIndex('rate_events_lookup_idx')
    .on('rate_events')
    .columns(['kind', 'key', 'created_at'])
    .execute();

  await db.schema
    .createTable('brands')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('slug', 'text', (c) => c.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('is_demo', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('fragrance_families')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('slug', 'text', (c) => c.notNull().unique())
    .addColumn('sort_order', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('is_demo', 'integer', (c) => c.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable('notes')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('slug', 'text', (c) => c.notNull().unique())
    .addColumn('is_demo', 'integer', (c) => c.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable('perfumes')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('brand_id', 'integer', (c) => c.notNull().references('brands.id'))
    .addColumn('family_id', 'integer', (c) =>
      c.references('fragrance_families.id').onDelete('set null'),
    )
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('slug', 'text', (c) => c.notNull().unique())
    .addColumn('description_md', 'text', (c) => c.notNull())
    .addColumn('concentration', 'text', (c) => c.notNull())
    .addColumn('gender', 'text')
    .addColumn('stock_status', 'text', (c) => c.notNull().defaultTo('in_stock'))
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('draft'))
    .addColumn('is_featured', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('allergens_text', 'text')
    .addColumn('seo_title', 'text')
    .addColumn('seo_description', 'text')
    .addColumn('search_text', 'text', (c) => c.notNull().defaultTo(''))
    .addColumn('sort_name', 'text', (c) => c.notNull().defaultTo(''))
    .addColumn('min_price_kurus', 'integer')
    .addColumn('published_at', 'text')
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addColumn('is_demo', 'integer', (c) => c.notNull().defaultTo(0))
    .addCheckConstraint('perfumes_status_chk', sql`status in ('draft', 'published')`)
    .execute();
  await db.schema
    .createIndex('perfumes_visibility_idx')
    .on('perfumes')
    .columns(['status', 'deleted_at', 'published_at'])
    .execute();
  await db.schema.createIndex('perfumes_created_idx').on('perfumes').column('created_at').execute();
  await db.schema.createIndex('perfumes_brand_idx').on('perfumes').column('brand_id').execute();
  await db.schema.createIndex('perfumes_family_idx').on('perfumes').column('family_id').execute();

  await db.schema
    .createTable('perfume_notes')
    .addColumn('perfume_id', 'integer', (c) =>
      c.notNull().references('perfumes.id').onDelete('cascade'),
    )
    .addColumn('note_id', 'integer', (c) => c.notNull().references('notes.id').onDelete('cascade'))
    .addColumn('tier', 'text', (c) => c.notNull())
    .addPrimaryKeyConstraint('perfume_notes_pk', ['perfume_id', 'note_id', 'tier'])
    .execute();
  await db.schema
    .createIndex('perfume_notes_note_idx')
    .on('perfume_notes')
    .column('note_id')
    .execute();

  await db.schema
    .createTable('perfume_variants')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('perfume_id', 'integer', (c) =>
      c.notNull().references('perfumes.id').onDelete('cascade'),
    )
    .addColumn('volume_ml', 'integer', (c) => c.notNull())
    .addColumn('price_kurus', 'integer')
    .addColumn('sort_order', 'integer', (c) => c.notNull().defaultTo(0))
    .execute();
  await db.schema
    .createIndex('perfume_variants_perfume_idx')
    .on('perfume_variants')
    .column('perfume_id')
    .execute();

  await db.schema
    .createTable('perfume_images')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('perfume_id', 'integer', (c) =>
      c.notNull().references('perfumes.id').onDelete('cascade'),
    )
    .addColumn('sort_order', 'integer', (c) => c.notNull())
    .addColumn('is_cover', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('alt_text', 'text', (c) => c.notNull().defaultTo(''))
    .addColumn('width', 'integer', (c) => c.notNull())
    .addColumn('height', 'integer', (c) => c.notNull())
    .addColumn('widths', 'text', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute();
  await db.schema
    .createIndex('perfume_images_perfume_idx')
    .on('perfume_images')
    .columns(['perfume_id', 'sort_order'])
    .execute();
  await sql`
    CREATE TRIGGER perfume_images_limit
    BEFORE INSERT ON perfume_images
    WHEN (SELECT COUNT(*) FROM perfume_images WHERE perfume_id = NEW.perfume_id) >= 8
    BEGIN
      SELECT RAISE(ABORT, 'image_limit');
    END
  `.execute(db);

  await db.schema
    .createTable('site_settings')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('value_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('contact_messages')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('contact', 'text', (c) => c.notNull())
    .addColumn('message', 'text', (c) => c.notNull())
    .addColumn('perfume_id', 'integer', (c) => c.references('perfumes.id').onDelete('set null'))
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('read_at', 'text')
    .execute();
  await db.schema
    .createIndex('contact_messages_created_idx')
    .on('contact_messages')
    .column('created_at')
    .execute();

  await db.schema
    .createTable('audit_log')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('admin_id', 'integer', (c) => c.references('admins.id').onDelete('set null'))
    .addColumn('action', 'text', (c) => c.notNull())
    .addColumn('entity', 'text', (c) => c.notNull())
    .addColumn('entity_id', 'text')
    .addColumn('summary', 'text', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute();
  await db.schema
    .createIndex('audit_log_created_idx')
    .on('audit_log')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS perfume_images_limit`.execute(db);
  for (const table of [
    'audit_log',
    'contact_messages',
    'site_settings',
    'perfume_images',
    'perfume_variants',
    'perfume_notes',
    'perfumes',
    'notes',
    'fragrance_families',
    'brands',
    'rate_events',
    'sessions',
    'admins',
  ]) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
