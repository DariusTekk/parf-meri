'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StateMessage } from '@/components/ui/StateMessage';
import { sendJson } from '@/components/ui/form';
import { formatDateTime } from '@/lib/shared/format';

type Message = {
  id: number;
  name: string;
  contact: string;
  message: string;
  created_at: string;
  read_at: string | null;
  perfume_name: string | null;
  perfume_id: number | null;
};

export function MessageList({ items }: { items: Message[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const mark = async (m: Message) => {
    const res = await sendJson(`/api/admin/mesajlar/${m.id}`, 'PATCH', {
      read: m.read_at === null,
    });
    if (!res.ok) return setNotice({ kind: 'error', text: res.message });
    router.refresh();
  };
  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    const res = await sendJson(`/api/admin/mesajlar/${toDelete.id}`, 'DELETE');
    setBusy(false);
    setToDelete(null);
    if (!res.ok) return setNotice({ kind: 'error', text: res.message });
    setNotice({ kind: 'success', text: 'Mesaj silindi.' });
    router.refresh();
  };

  return (
    <div className="stack">
      <div role="status" aria-live="polite" ref={noticeRef} tabIndex={-1}>
        {notice ? (
          <StateMessage
            kind={notice.kind}
            title={notice.kind === 'error' ? 'İşlem yapılamadı' : 'Tamamlandı'}
          >
            {notice.text}
          </StateMessage>
        ) : null}
      </div>
      {items.length === 0 ? (
        <StateMessage kind="empty" title="Mesaj yok">
          İletişim formundan gelen mesajlar burada listelenir.
        </StateMessage>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
          {items.map((m) => (
            <li
              key={m.id}
              className="card stack"
              style={{ borderLeft: m.read_at ? undefined : '4px solid var(--c-accent)' }}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18, fontFamily: 'var(--font-body)', margin: 0 }}>
                  {m.name} {m.read_at ? null : <span className="badge badge-warning">Yeni</span>}
                </h2>
                <span className="muted" style={{ fontSize: 14 }}>
                  {formatDateTime(m.created_at)}
                </span>
              </div>
              <p style={{ margin: 0 }}>
                <strong>İletişim:</strong> {m.contact}
              </p>
              {m.perfume_name && m.perfume_id ? (
                <p style={{ margin: 0 }}>
                  <strong>Parfüm:</strong>{' '}
                  <Link href={`/admin/parfumler/${m.perfume_id}`}>{m.perfume_name}</Link>
                </p>
              ) : null}
              <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{m.message}</p>
              <div className="row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => mark(m)}>
                  {m.read_at ? 'Okunmadı yap' : 'Okundu yap'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setToDelete(m)}
                  aria-label={`Sil: ${m.name} mesajı`}
                >
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Mesaj silinsin mi?"
        body="Mesaj ve içindeki kişisel veriler kalıcı olarak silinir."
        confirmLabel="Sil"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
