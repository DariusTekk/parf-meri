'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { imageUrl } from '@/components/ui/Picture';
import { StateMessage } from '@/components/ui/StateMessage';
import { sendJson } from '@/components/ui/form';
import {
  STATUS_LABELS,
  STOCK_LABELS,
  type PerfumeStatus,
  type StockStatus,
} from '@/lib/shared/domain';
import { formatDateTime } from '@/lib/shared/format';
import type { ImageInfo } from '@/lib/shared/types';

type Row = {
  id: number;
  name: string;
  slug: string;
  status: PerfumeStatus;
  deletedAt: string | null;
  updatedAt: string;
  isFeatured: boolean;
  stockStatus: StockStatus;
  brandName: string;
  imageCount: number;
  cover: ImageInfo | null;
};

type Notice = { kind: 'success' | 'error' | 'warning'; text: string; undoId?: number } | null;

export function PerfumeTable({
  items,
  deletedView,
  empty,
}: {
  items: Row[];
  deletedView: boolean;
  empty: ReactNode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  // İşlem sonrası silinen satırın düğmesi kaybolduğu için odak sonuç bildirimine taşınır.
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  const bulk = async (status: PerfumeStatus) => {
    setBusy(true);
    const res = await sendJson<{
      changed: number[];
      skipped: Array<{ id: number; reason: string }>;
    }>('/api/admin/parfumler/toplu', 'POST', { ids: [...selected], status });
    setBusy(false);
    if (!res.ok) return setNotice({ kind: 'error', text: res.message });
    const { changed, skipped } = res.data;
    const label = status === 'draft' ? 'yayından kaldırıldı' : 'yayınlandı';
    setNotice({
      kind: skipped.length > 0 ? 'warning' : 'success',
      text:
        `${changed.length} parfüm ${label}.` +
        (skipped.length > 0
          ? ` ${skipped.length} parfüm atlandı: ${[...new Set(skipped.map((s) => s.reason))].join(' ')}`
          : ''),
    });
    setSelected(new Set());
    router.refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    const res = await sendJson(`/api/admin/parfumler/${toDelete.id}`, 'DELETE');
    setBusy(false);
    const row = toDelete;
    setToDelete(null);
    if (!res.ok) return setNotice({ kind: 'error', text: res.message });
    setNotice({
      kind: 'success',
      text: `"${row.name}" silindi. Silinenler sekmesinden ya da hemen geri alabilirsiniz.`,
      undoId: row.id,
    });
    router.refresh();
  };

  const restore = async (id: number) => {
    setBusy(true);
    const res = await sendJson(`/api/admin/parfumler/${id}/geri-al`, 'POST');
    setBusy(false);
    if (!res.ok) return setNotice({ kind: 'error', text: res.message });
    setNotice({ kind: 'success', text: 'Parfüm geri alındı.' });
    router.refresh();
  };

  return (
    <div className="stack">
      <div ref={noticeRef} tabIndex={-1} role="status" aria-live="polite">
        {notice ? (
          <StateMessage
            kind={notice.kind}
            title={
              notice.kind === 'error'
                ? 'İşlem yapılamadı'
                : notice.kind === 'warning'
                  ? 'Kısmen tamamlandı'
                  : 'Tamamlandı'
            }
            action={
              notice.undoId ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => restore(notice.undoId!)}
                  disabled={busy}
                >
                  Geri al
                </button>
              ) : undefined
            }
          >
            {notice.text}
          </StateMessage>
        ) : null}
      </div>

      {items.length === 0 ? empty : null}

      {!deletedView && items.length > 0 ? (
        <div className="row" aria-live="polite">
          <span className="muted">{selected.size} seçili</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={selected.size === 0 || busy}
            onClick={() => bulk('draft')}
          >
            Seçilenleri yayından kaldır
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={selected.size === 0 || busy}
            onClick={() => bulk('published')}
          >
            Seçilenleri yayınla
          </button>
        </div>
      ) : null}

      <div className="table-wrap" hidden={items.length === 0}>
        <table>
          <caption className="visually-hidden">Parfüm listesi</caption>
          <thead>
            <tr>
              {!deletedView ? (
                <th scope="col">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
                      }
                    />
                    <span className="visually-hidden">Tümünü seç</span>
                  </label>
                </th>
              ) : null}
              <th scope="col">Görsel</th>
              <th scope="col">Parfüm</th>
              <th scope="col">Durum</th>
              <th scope="col">Güncelleme</th>
              <th scope="col">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                {!deletedView ? (
                  <td>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                      <span className="visually-hidden">{r.name} seç</span>
                    </label>
                  </td>
                ) : null}
                <td>
                  {r.cover ? (
                    <img
                      className="thumb-sm"
                      src={imageUrl(r.cover.id, r.cover.widths[0] ?? 400)}
                      alt=""
                      width={48}
                      height={60}
                      loading="lazy"
                    />
                  ) : (
                    <span className="badge badge-warning">Görsel yok</span>
                  )}
                </td>
                <td style={{ minWidth: 180 }}>
                  <Link
                    href={`/admin/parfumler/${r.id}`}
                    style={{ fontWeight: 600, color: 'var(--c-text)' }}
                  >
                    {r.name}
                  </Link>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {r.brandName} · {r.imageCount} görsel · {STOCK_LABELS[r.stockStatus]}
                    {r.isFeatured ? ' · Öne çıkan' : ''}
                  </div>
                </td>
                <td>
                  {r.deletedAt ? (
                    <span className="badge badge-danger">Silindi</span>
                  ) : (
                    <span className={`badge ${r.status === 'published' ? 'badge-success' : ''}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
                  {formatDateTime(r.updatedAt)}
                </td>
                <td>
                  <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    {r.deletedAt ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => restore(r.id)}
                        disabled={busy}
                        aria-label={`Geri al: ${r.name}`}
                      >
                        Geri al
                      </button>
                    ) : (
                      <>
                        <Link
                          className="btn btn-secondary btn-sm"
                          href={`/admin/parfumler/${r.id}`}
                          aria-label={`Düzenle: ${r.name}`}
                        >
                          Düzenle
                        </Link>
                        <Link
                          className="btn btn-ghost btn-sm"
                          href={`/admin/parfumler/${r.id}/onizleme`}
                          aria-label={`Önizle: ${r.name}`}
                        >
                          Önizle
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setToDelete(r)}
                          aria-label={`Sil: ${r.name}`}
                        >
                          Sil
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Parfüm silinsin mi?"
        body={`"${toDelete?.name ?? ''}" vitrinden kaldırılacak ve Silinenler sekmesine taşınacak. Bu işlemi daha sonra geri alabilirsiniz.`}
        confirmLabel="Sil"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
