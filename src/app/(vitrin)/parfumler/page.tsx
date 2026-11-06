import type { Metadata } from 'next';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { StateMessage } from '@/components/ui/StateMessage';
import { PerfumeGrid } from '@/components/vitrin/PerfumeCardView';
import { catalogFacets, listPublished } from '@/lib/server/perfumes';
import { CONCENTRATIONS, CONCENTRATION_LABELS, SORT_OPTIONS } from '@/lib/shared/domain';
import { catalogQuerySchema, type CatalogQuery } from '@/lib/shared/schemas';
import { t } from '@/i18n/tr';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parse(raw: Record<string, string | string[] | undefined>): CatalogQuery {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v === '' ? undefined : v]),
  );
  return catalogQuerySchema.parse(flat);
}

function hrefWith(
  query: CatalogQuery,
  patch: Partial<Record<keyof CatalogQuery, string | number | undefined>>,
) {
  const params = new URLSearchParams();
  const merged = { ...query, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== '' && !(k === 'sayfa' && v === 1)) params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `/parfumler?${s}` : '/parfumler';
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const query = parse(await searchParams);
  const page = query.sayfa && query.sayfa > 1 ? query.sayfa : undefined;
  const filtered = Boolean(
    query.q ||
    query.marka ||
    query.aile ||
    query.nota ||
    query.konsantrasyon ||
    query.min ||
    query.max,
  );
  return {
    title: page ? `${t.catalog.title} (sayfa ${page})` : t.catalog.title,
    description:
      'Koleksiyondaki tüm parfümler: marka, koku ailesi, nota, konsantrasyon ve fiyata göre süzün.',
    alternates: { canonical: page ? `/parfumler?sayfa=${page}` : '/parfumler' },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parse(await searchParams);
  const [result, facets] = await Promise.all([listPublished(query), catalogFacets()]);

  const active: Array<{ key: keyof CatalogQuery; label: string }> = [];
  if (query.q) active.push({ key: 'q', label: `"${query.q}"` });
  const nameOf = (kind: 'brand' | 'family' | 'note', slug?: string) =>
    facets[kind].find((f) => f.slug === slug)?.name ?? slug ?? '';
  if (query.marka)
    active.push({ key: 'marka', label: `${t.catalog.brand}: ${nameOf('brand', query.marka)}` });
  if (query.aile)
    active.push({ key: 'aile', label: `${t.catalog.family}: ${nameOf('family', query.aile)}` });
  if (query.nota)
    active.push({ key: 'nota', label: `${t.catalog.note}: ${nameOf('note', query.nota)}` });
  if (query.konsantrasyon)
    active.push({ key: 'konsantrasyon', label: CONCENTRATION_LABELS[query.konsantrasyon] });
  if (query.min !== undefined)
    active.push({ key: 'min', label: `${t.catalog.min}: ${query.min} ₺` });
  if (query.max !== undefined)
    active.push({ key: 'max', label: `${t.catalog.max}: ${query.max} ₺` });

  const filtersOpenByDefault = active.length > 0;

  return (
    <div className="container section-tight">
      <h1>{t.catalog.title}</h1>
      <form
        method="get"
        action="/parfumler"
        role="search"
        className="row"
        style={{ marginBottom: 24 }}
      >
        <label htmlFor="katalog-ara" className="visually-hidden">
          {t.catalog.search}
        </label>
        <input
          id="katalog-ara"
          type="search"
          name="q"
          defaultValue={query.q ?? ''}
          className="input"
          placeholder={t.catalog.search}
          style={{ flex: '1 1 220px' }}
          maxLength={100}
        />
        {(['marka', 'aile', 'nota', 'konsantrasyon', 'min', 'max', 'sirala'] as const).map((k) =>
          query[k] !== undefined ? (
            <input key={k} type="hidden" name={k} value={String(query[k])} />
          ) : null,
        )}
        <button type="submit" className="btn btn-primary">
          {t.catalog.searchButton}
        </button>
      </form>

      <div className="catalog-layout">
        <aside aria-labelledby="filtre-baslik">
          <details className="filters-panel" open={filtersOpenByDefault || undefined}>
            <summary className="btn btn-secondary filters-toggle">
              <SlidersHorizontal size={20} aria-hidden="true" />
              <span id="filtre-baslik">{t.catalog.filters}</span>
            </summary>
            <form
              method="get"
              action="/parfumler"
              className="filters card"
              style={{ marginTop: 12 }}
            >
              {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
              {query.sirala ? <input type="hidden" name="sirala" value={query.sirala} /> : null}
              <div className="field">
                <label className="field-label" htmlFor="f-marka">
                  {t.catalog.brand}
                </label>
                <select
                  id="f-marka"
                  name="marka"
                  className="select"
                  defaultValue={query.marka ?? ''}
                >
                  <option value="">{t.catalog.all}</option>
                  {facets.brand.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="f-aile">
                  {t.catalog.family}
                </label>
                <select id="f-aile" name="aile" className="select" defaultValue={query.aile ?? ''}>
                  <option value="">{t.catalog.all}</option>
                  {facets.family.map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="f-nota">
                  {t.catalog.note}
                </label>
                <select id="f-nota" name="nota" className="select" defaultValue={query.nota ?? ''}>
                  <option value="">{t.catalog.all}</option>
                  {facets.note.map((n) => (
                    <option key={n.slug} value={n.slug}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="f-kons">
                  {t.catalog.concentration}
                </label>
                <select
                  id="f-kons"
                  name="konsantrasyon"
                  className="select"
                  defaultValue={query.konsantrasyon ?? ''}
                >
                  <option value="">{t.catalog.all}</option>
                  {CONCENTRATIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONCENTRATION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend>{t.catalog.priceRange}</legend>
                <div className="price-range">
                  <div className="field">
                    <label className="field-label" htmlFor="f-min">
                      {t.catalog.min}
                    </label>
                    <input
                      id="f-min"
                      name="min"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="input"
                      defaultValue={query.min ?? ''}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="f-max">
                      {t.catalog.max}
                    </label>
                    <input
                      id="f-max"
                      name="max"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="input"
                      defaultValue={query.max ?? ''}
                    />
                  </div>
                </div>
              </fieldset>
              <button type="submit" className="btn btn-primary">
                {t.catalog.apply}
              </button>
              {active.length > 0 ? (
                <Link
                  href={query.q ? `/parfumler?q=${encodeURIComponent(query.q)}` : '/parfumler'}
                  className="btn btn-ghost"
                >
                  {t.catalog.clear}
                </Link>
              ) : null}
            </form>
          </details>
        </aside>

        <section aria-labelledby="sonuc-baslik">
          <div className="results-bar">
            <h2
              id="sonuc-baslik"
              style={{ fontSize: 18, fontFamily: 'var(--font-body)', margin: 0 }}
              aria-live="polite"
            >
              {t.catalog.results(result.total)}
            </h2>
            <form method="get" action="/parfumler" className="row">
              {Object.entries(query).map(([k, v]) =>
                k !== 'sirala' && k !== 'sayfa' && v !== undefined ? (
                  <input key={k} type="hidden" name={k} value={String(v)} />
                ) : null,
              )}
              <label htmlFor="siralama" className="field-label">
                {t.catalog.sort}
              </label>
              <select
                id="siralama"
                name="sirala"
                defaultValue={query.sirala ?? 'yeni'}
                className="select"
                style={{ width: 'auto' }}
              >
                {Object.entries(SORT_OPTIONS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary btn-sm">
                {t.catalog.apply}
              </button>
            </form>
          </div>

          {active.length > 0 ? (
            <ul
              className="active-filters"
              aria-label="Etkin filtreler"
              style={{ listStyle: 'none', padding: 0 }}
            >
              {active.map((a) => (
                <li key={a.key}>
                  <Link
                    className="badge"
                    style={{ minHeight: 32, textDecoration: 'none' }}
                    href={hrefWith(query, { [a.key]: undefined, sayfa: undefined })}
                  >
                    {a.label}
                    <X size={14} aria-hidden="true" />
                    <span className="visually-hidden"> filtresini kaldır</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {result.items.length === 0 ? (
            <StateMessage
              kind="empty"
              title={t.catalog.emptyTitle}
              action={
                <Link href="/parfumler" className="btn btn-secondary">
                  {t.catalog.clear}
                </Link>
              }
            >
              {t.catalog.emptyBody}
            </StateMessage>
          ) : (
            <PerfumeGrid items={result.items} priorityCount={2} label={t.catalog.title} />
          )}

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={(p) => hrefWith(query, { sayfa: p })}
          />
        </section>
      </div>
    </div>
  );
}
