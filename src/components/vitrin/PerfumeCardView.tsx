import Link from 'next/link';
import { Picture } from '@/components/ui/Picture';
import { Price } from '@/components/ui/Price';
import { STOCK_LABELS } from '@/lib/shared/domain';
import type { PerfumeCard } from '@/lib/shared/types';
import { t } from '@/i18n/tr';
import { FavoriteButton } from './FavoriteButton';

// Kart genişlikleri: mobilde 2 sütun, tablette 3, geniş ekranda 4 (katalogda yan panel var).
const CARD_SIZES = '(min-width: 1100px) 240px, (min-width: 768px) 30vw, 46vw';

export function StockBadge({ status }: { status: PerfumeCard['stockStatus'] }) {
  if (status === 'in_stock') return null;
  const cls = status === 'out' ? 'badge-danger' : 'badge-warning';
  return <span className={`badge ${cls}`}>{STOCK_LABELS[status]}</span>;
}

export function PerfumeCardView({
  perfume,
  priority = false,
  headingLevel = 3,
}: {
  perfume: PerfumeCard;
  priority?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="pcard">
      <div className="pcard-media">
        {perfume.cover ? (
          <Picture image={perfume.cover} sizes={CARD_SIZES} priority={priority} />
        ) : (
          <span className="muted">{t.product.noImage}</span>
        )}
      </div>
      <FavoriteButton slug={perfume.slug} name={perfume.name} />
      <div className="pcard-body">
        <p className="pcard-brand">{perfume.brandName}</p>
        <Heading className="pcard-title">
          <Link href={`/parfum/${perfume.slug}`}>{perfume.name}</Link>
        </Heading>
        <div className="pcard-meta">
          <span className="badge">
            {perfume.concentration === 'PARFUM' ? 'Parfum' : perfume.concentration}
          </span>
          <StockBadge status={perfume.stockStatus} />
        </div>
        <p className="pcard-price" style={{ margin: 0 }}>
          <Price kurus={perfume.minPriceKurus} from />
        </p>
      </div>
    </article>
  );
}

export function PerfumeGrid({
  items,
  priorityCount = 0,
  label,
  headingLevel = 3,
}: {
  items: PerfumeCard[];
  priorityCount?: number;
  label?: string;
  headingLevel?: 2 | 3;
}) {
  return (
    <ul className="grid" aria-label={label} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((p, i) => (
        <li key={p.id} style={{ display: 'flex' }}>
          <div style={{ width: '100%', display: 'flex' }}>
            <PerfumeCardView perfume={p} priority={i < priorityCount} headingLevel={headingLevel} />
          </div>
        </li>
      ))}
    </ul>
  );
}
