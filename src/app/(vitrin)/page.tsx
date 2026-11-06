import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StateMessage } from '@/components/ui/StateMessage';
import { PerfumeGrid } from '@/components/vitrin/PerfumeCardView';
import { catalogFacets, featuredPerfumes, newestPerfumes } from '@/lib/server/perfumes';
import { getSettings } from '@/lib/server/settings';
import { t } from '@/i18n/tr';

export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const [settings, featured, newest, facets] = await Promise.all([
    getSettings(),
    featuredPerfumes(4),
    newestPerfumes(8),
    catalogFacets(),
  ]);
  const isEmpty = newest.length === 0;

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1>{settings.tagline}</h1>
          {settings.heroText ? <p>{settings.heroText}</p> : null}
          <Link href="/parfumler" className="btn btn-primary">
            {t.home.cta}
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {isEmpty ? (
        <div className="container section">
          <StateMessage
            kind="empty"
            title={t.home.emptyTitle}
            action={
              <Link href="/iletisim" className="btn btn-secondary">
                {t.nav.contact}
              </Link>
            }
          >
            {t.home.emptyBody}
          </StateMessage>
        </div>
      ) : (
        <>
          {featured.length > 0 ? (
            <section className="container section" aria-labelledby="one-cikanlar">
              <div className="section-head">
                <h2 id="one-cikanlar">{t.home.featured}</h2>
              </div>
              <PerfumeGrid items={featured} priorityCount={2} label={t.home.featured} />
            </section>
          ) : null}
          <section className="container section" aria-labelledby="yeni-gelenler">
            <div className="section-head">
              <h2 id="yeni-gelenler">{t.home.newest}</h2>
              <Link href="/parfumler?sirala=yeni">{t.home.seeAll}</Link>
            </div>
            <PerfumeGrid
              items={newest}
              priorityCount={featured.length > 0 ? 0 : 2}
              label={t.home.newest}
            />
          </section>
          {facets.family.length > 0 ? (
            <section className="container section-tight" aria-labelledby="aileler">
              <h2 id="aileler">{t.home.families}</h2>
              <ul className="chips">
                {facets.family.map((f) => (
                  <li key={f.slug}>
                    <Link href={`/parfumler?aile=${f.slug}`}>{f.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
