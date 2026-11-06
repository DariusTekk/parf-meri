'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { CardGridSkeleton, StateMessage } from '@/components/ui/StateMessage';
import type { PerfumeCard } from '@/lib/shared/types';
import { whatsappUrl } from '@/lib/shared/whatsapp';
import { t } from '@/i18n/tr';
import { storageAvailable, useFavorites } from './favorites';
import { PerfumeGrid } from './PerfumeCardView';

type Result =
  | { key: string; kind: 'ready'; items: PerfumeCard[] }
  | { key: string; kind: 'error'; message: string };

const noopSubscribe = () => () => {};

export function FavoritesList({ whatsapp }: { whatsapp: string }) {
  const slugs = useFavorites();
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [result, setResult] = useState<Result | null>(null);
  const [reload, setReload] = useState(0);
  const key = slugs.join(',');
  const requestKey = `${key}#${reload}`;

  useEffect(() => {
    if (!hydrated || key === '') return;
    const controller = new AbortController();
    fetch(`/api/favoriler?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(t.common.unexpected);
        const data = (await res.json()) as { items: PerfumeCard[] };
        setResult({ key: requestKey, kind: 'ready', items: data.items });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResult({
          key: requestKey,
          kind: 'error',
          message: navigator.onLine ? t.common.unexpected : t.common.network,
        });
      });
    return () => controller.abort();
  }, [key, hydrated, requestKey]);

  if (hydrated && !storageAvailable()) {
    return <StateMessage kind="warning" title={t.favorites.storageError} />;
  }
  const state: Result | { kind: 'loading' } =
    key === ''
      ? { key: '', kind: 'ready', items: [] }
      : result && result.key === requestKey
        ? result
        : { kind: 'loading' };
  if (!hydrated || state.kind === 'loading') return <CardGridSkeleton count={4} />;
  if (state.kind === 'error') {
    return (
      <StateMessage
        kind="error"
        title={t.catalog.errorTitle}
        live
        action={
          <button type="button" className="btn btn-primary" onClick={() => setReload((n) => n + 1)}>
            {t.common.retry}
          </button>
        }
      >
        {state.message}
      </StateMessage>
    );
  }
  if (state.items.length === 0) {
    return (
      <StateMessage
        kind="empty"
        title={t.favorites.emptyTitle}
        action={
          <Link href="/parfumler" className="btn btn-primary">
            {t.home.cta}
          </Link>
        }
      >
        {t.favorites.emptyBody}
      </StateMessage>
    );
  }
  const list = state.items.map((p) => `- ${p.brandName} ${p.name}`).join('\n');
  const wa = whatsappUrl(whatsapp, t.favorites.whatsappText(list));
  return (
    <div className="stack">
      <p role="status">{state.items.length} parfüm favorilerinizde.</p>
      {wa ? (
        <a className="btn btn-primary" href={wa} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={20} aria-hidden="true" />
          {t.favorites.askAll}
          <span className="visually-hidden"> (yeni sekmede açılır)</span>
        </a>
      ) : null}
      <PerfumeGrid items={state.items} headingLevel={2} label={t.favorites.title} />
    </div>
  );
}
