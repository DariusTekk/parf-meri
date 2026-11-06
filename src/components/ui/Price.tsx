import { formatPrice } from '@/lib/shared/format';
import { t } from '@/i18n/tr';

export function Price({ kurus, from = false }: { kurus: number | null; from?: boolean }) {
  if (kurus === null) return <span className="price-ask">{t.price.ask}</span>;
  return (
    <span>
      {from ? <span className="muted">{t.price.from} </span> : null}
      {formatPrice(kurus)}
    </span>
  );
}
