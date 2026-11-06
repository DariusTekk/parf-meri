'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StateMessage } from '@/components/ui/StateMessage';
import { Field, describedBy, sendJson } from '@/components/ui/form';

type Item = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  perfumeCount: number | null;
};

export function TaxonomyManager({
  kind,
  singular,
  items,
  withDescription = false,
  publicPrefix,
}: {
  kind: 'marka' | 'koku-ailesi' | 'nota';
  singular: string;
  items: Item[];
  withDescription?: boolean;
  publicPrefix?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: number; name: string; description: string } | null>(
    null,
  );
  const [editError, setEditError] = useState('');
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const base = `/api/admin/taksonomi/${kind}`;
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Ad en az 2 karakter olmalıdır.');
      document.getElementById('yeni-ad')?.focus();
      return;
    }
    setBusy(true);
    const res = await sendJson(base, 'POST', {
      name,
      description: withDescription ? description : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.fields?.name ?? res.message);
      document.getElementById('yeni-ad')?.focus();
      return;
    }
    setNotice({ kind: 'success', text: `"${name.trim()}" eklendi.` });
    setName('');
    setDescription('');
    router.refresh();
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const res = await sendJson(`${base}/${editing.id}`, 'PATCH', {
      name: editing.name,
      description: withDescription ? editing.description : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setEditError(res.fields?.name ?? res.message);
      return;
    }
    setNotice({ kind: 'success', text: 'Kaydedildi.' });
    setEditing(null);
    setEditError('');
    router.refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    const res = await sendJson(`${base}/${toDelete.id}`, 'DELETE');
    setBusy(false);
    const item = toDelete;
    setToDelete(null);
    if (!res.ok) return setNotice({ kind: 'error', text: res.message });
    setNotice({ kind: 'success', text: `"${item.name}" silindi.` });
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
      <form onSubmit={create} className="card stack" noValidate>
        <h2 style={{ fontSize: 20, margin: 0 }}>Yeni {singular.toLocaleLowerCase('tr-TR')}</h2>
        <Field id="yeni-ad" label="Ad" error={error} required>
          <input
            id="yeni-ad"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy('yeni-ad', false, error)}
          />
        </Field>
        {withDescription ? (
          <Field
            id="yeni-aciklama"
            label="Açıklama"
            hint="İsteğe bağlı; marka sayfasında gösterilir."
          >
            <textarea
              id="yeni-aciklama"
              className="textarea"
              style={{ minHeight: 100 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              aria-describedby="yeni-aciklama-ipucu"
            />
          </Field>
        ) : null}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={busy}
        >
          Ekle
        </button>
      </form>

      {items.length === 0 ? (
        <StateMessage kind="empty" title="Henüz kayıt yok">
          Yukarıdaki formla ilk kaydı ekleyin.
        </StateMessage>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">{singular} listesi</caption>
            <thead>
              <tr>
                <th scope="col">Ad</th>
                <th scope="col">Parfüm sayısı</th>
                <th scope="col">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {editing?.id === item.id ? (
                      <form onSubmit={save} className="stack" noValidate>
                        <Field id={`duzenle-${item.id}`} label="Ad" error={editError}>
                          <input
                            id={`duzenle-${item.id}`}
                            className="input"
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            autoFocus
                            aria-invalid={editError ? true : undefined}
                            aria-describedby={describedBy(`duzenle-${item.id}`, false, editError)}
                          />
                        </Field>
                        {withDescription ? (
                          <Field id={`duzenle-aciklama-${item.id}`} label="Açıklama">
                            <textarea
                              id={`duzenle-aciklama-${item.id}`}
                              className="textarea"
                              style={{ minHeight: 80 }}
                              value={editing.description}
                              onChange={(e) =>
                                setEditing({ ...editing, description: e.target.value })
                              }
                            />
                          </Field>
                        ) : null}
                        <div className="row">
                          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                            Kaydet
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditing(null);
                              setEditError('');
                            }}
                          >
                            Vazgeç
                          </button>
                        </div>
                      </form>
                    ) : publicPrefix && (item.perfumeCount ?? 0) > 0 ? (
                      <a href={`${publicPrefix}${item.slug}`} target="_blank" rel="noopener">
                        {item.name}
                      </a>
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>{item.perfumeCount ?? 0}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-label={`Düzenle: ${item.name}`}
                        onClick={() =>
                          setEditing({
                            id: item.id,
                            name: item.name,
                            description: item.description ?? '',
                          })
                        }
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setToDelete(item)}
                        aria-label={`Sil: ${item.name}`}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={`${singular} silinsin mi?`}
        body={`"${toDelete?.name ?? ''}" kalıcı olarak silinecek. Kullanımdaysa silinmez ve nedeni gösterilir.`}
        confirmLabel="Sil"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
