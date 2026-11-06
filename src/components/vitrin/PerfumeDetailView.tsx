import Link from 'next/link';
import { MessageCircle, Mail } from 'lucide-react';
import { Price } from '@/components/ui/Price';
import {
  CONCENTRATION_LABELS,
  GENDER_LABELS,
  NOTE_TIERS,
  NOTE_TIER_LABELS,
  STOCK_LABELS,
} from '@/lib/shared/domain';
import { renderMarkdown } from '@/lib/shared/markdown';
import type { PerfumeCard } from '@/lib/shared/types';
import { whatsappUrl } from '@/lib/shared/whatsapp';
import type { PerfumeDetail } from '@/lib/server/perfumes';
import { t } from '@/i18n/tr';
import { FavoriteButton } from './FavoriteButton';
import { Gallery } from './Gallery';
import { PerfumeGrid, StockBadge } from './PerfumeCardView';
import { ShareButton } from './ShareButton';

export function PerfumeDetailView({
  perfume,
  similar,
  whatsapp,
  pageUrl,
}: {
  perfume: PerfumeDetail;
  similar: PerfumeCard[];
  whatsapp: string;
  pageUrl: string;
}) {
  const wa = whatsappUrl(
    whatsapp,
    t.product.whatsappText(perfume.name, perfume.brand.name, pageUrl),
  );
  const hasNotes = NOTE_TIERS.some((tier) => perfume.notes[tier].length > 0);
  return (
    <div className="container">
      <nav aria-label="Konum" className="breadcrumbs">
        <ol>
          <li>
            <Link href="/">{t.common.home}</Link>
          </li>
          <li>
            <Link href="/parfumler">{t.nav.catalog}</Link>
          </li>
          <li>
            <Link href={`/marka/${perfume.brand.slug}`}>{perfume.brand.name}</Link>
          </li>
          <li aria-current="page">{perfume.name}</li>
        </ol>
      </nav>
      <div className="detail-layout">
        <div className="detail-gallery">
          <Gallery images={perfume.images} name={perfume.name} />
        </div>
        <div className="detail-info">
          <p className="detail-brand">
            <Link href={`/marka/${perfume.brand.slug}`}>{perfume.brand.name}</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>{perfume.name}</h1>
          <div className="row">
            <span className="badge" lang="fr">
              {CONCENTRATION_LABELS[perfume.concentration]}
            </span>
            {perfume.gender ? <span className="badge">{GENDER_LABELS[perfume.gender]}</span> : null}
            {perfume.stockStatus === 'in_stock' ? (
              <span className="badge badge-success">{STOCK_LABELS.in_stock}</span>
            ) : (
              <StockBadge status={perfume.stockStatus} />
            )}
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            <Price kurus={perfume.minPriceKurus} from={perfume.variants.length > 1} />
          </p>

          {perfume.variants.length > 0 ? (
            <section aria-labelledby="hacim-baslik">
              <h2 id="hacim-baslik" style={{ fontSize: 20 }}>
                {t.product.variants}
              </h2>
              <ul className="variants">
                {perfume.variants.map((v) => (
                  <li key={v.volumeMl}>
                    <span>{v.volumeMl} ml</span>
                    <strong>
                      <Price kurus={v.priceKurus} />
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="row">
            {wa ? (
              <a className="btn btn-primary" href={wa} rel="noopener noreferrer" target="_blank">
                <MessageCircle size={20} aria-hidden="true" />
                {t.product.askWhatsApp}
                <span className="visually-hidden"> (yeni sekmede açılır)</span>
              </a>
            ) : null}
            <Link
              className={`btn ${wa ? 'btn-secondary' : 'btn-primary'}`}
              href={`/iletisim?parfum=${encodeURIComponent(perfume.slug)}`}
            >
              <Mail size={20} aria-hidden="true" />
              {t.product.askForm}
            </Link>
            <FavoriteButton slug={perfume.slug} name={perfume.name} variant="full" />
            <ShareButton title={`${perfume.brand.name} ${perfume.name}`} />
          </div>

          {hasNotes ? (
            <section aria-labelledby="nota-baslik">
              <h2 id="nota-baslik" style={{ fontSize: 20 }}>
                {t.product.notes}
              </h2>
              <div className="pyramid">
                {NOTE_TIERS.filter((tier) => perfume.notes[tier].length > 0).map((tier) => (
                  <div key={tier} className="pyramid-tier">
                    <h3>{NOTE_TIER_LABELS[tier]}</h3>
                    <ul className="chips">
                      {perfume.notes[tier].map((n) => (
                        <li key={n.id}>
                          <Link href={`/parfumler?nota=${n.slug}`}>{n.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <dl style={{ margin: 0 }}>
            {perfume.family ? (
              <div className="row" style={{ gap: 8 }}>
                <dt style={{ fontWeight: 600 }}>{t.product.family}:</dt>
                <dd style={{ margin: 0 }}>
                  <Link href={`/parfumler?aile=${perfume.family.slug}`}>{perfume.family.name}</Link>
                </dd>
              </div>
            ) : null}
          </dl>

          {perfume.allergens ? (
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {t.product.allergens}
              </summary>
              <p style={{ whiteSpace: 'pre-line' }}>{perfume.allergens}</p>
            </details>
          ) : null}
        </div>
        <section className="detail-desc" aria-labelledby="aciklama-baslik">
          <h2 id="aciklama-baslik">{t.product.description}</h2>
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(perfume.descriptionMd) }}
          />
        </section>
      </div>

      {similar.length > 0 ? (
        <section className="section" aria-labelledby="benzer-baslik">
          <h2 id="benzer-baslik">{t.product.similar}</h2>
          <PerfumeGrid items={similar} label={t.product.similar} />
        </section>
      ) : null}
    </div>
  );
}
