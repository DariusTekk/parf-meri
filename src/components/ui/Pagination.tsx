import Link from 'next/link';

function pagesToShow(page: number, count: number): Array<number | 'gap'> {
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  for (const [i, p] of sorted.entries()) {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push('gap');
    out.push(p);
  }
  return out;
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
  label = 'Sayfalar',
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={label}>
      <ul className="pagination">
        {page > 1 ? (
          <li>
            <Link href={hrefFor(page - 1)} rel="prev">
              Önceki
            </Link>
          </li>
        ) : null}
        {pagesToShow(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true">
              <span>…</span>
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Sayfa ${p}`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        {page < pageCount ? (
          <li>
            <Link href={hrefFor(page + 1)} rel="next">
              Sonraki
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
