'use client';

import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, GripVertical, Star, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { imageUrl } from '@/components/ui/Picture';
import { StateMessage } from '@/components/ui/StateMessage';
import { sendJson, type ApiErrorBody } from '@/components/ui/form';
import { IMAGE_LIMITS } from '@/lib/shared/domain';

export type AdminImage = {
  id: string;
  alt_text: string;
  width: number;
  height: number;
  widths: string;
  is_cover: number;
  sort_order: number;
};

type Upload = { name: string; progress: number; error?: string; done?: boolean };

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Barındırma platformunun istek gövdesi sınırı (Vercel'de 4,5 MB) nedeniyle 4 MB'ı aşan
 * görseller yüklenmeden önce tarayıcıda en fazla 2400 px genişliğe küçültülüp WebP'ye çevrilir.
 * 5 MB sınırı ve sunucudaki tür, imza ve boyut doğrulaması aynen geçerlidir.
 */
const SHRINK_ABOVE = 4 * 1024 * 1024;

async function shrinkIfNeeded(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.9, 0.8, 0.7]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
      if (blob && blob.size <= SHRINK_ABOVE) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', {
          type: 'image/webp',
        });
      }
    }
  } catch {
    // Tarayıcı görseli açamazsa dosya olduğu gibi gönderilir; sunucu gerekli hatayı döndürür.
  }
  return file;
}

function uploadOne(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<{ ok: boolean; status: number; body: unknown }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('x-istek', 'panel');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        body: xhr.response,
      });
    xhr.onerror = () => resolve({ ok: false, status: 0, body: null });
    xhr.onabort = () => resolve({ ok: false, status: 0, body: null });
    const form = new FormData();
    form.append('dosya', file);
    xhr.send(form);
  });
}

export function ImageManager({
  perfumeId,
  initialImages,
}: {
  perfumeId: number;
  initialImages: AdminImage[];
}) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [savingAlt, setSavingAlt] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [toDelete, setToDelete] = useState<AdminImage | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const base = `/api/admin/parfumler/${perfumeId}/gorseller`;

  const remaining = IMAGE_LIMITS.maxPerPerfume - images.length;

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    setMessage(null);
    if (files.length === 0) return;
    const queue: Upload[] = files.map((f) => ({ name: f.name, progress: 0 }));
    files.forEach((f, i) => {
      const q = queue[i]!;
      if (i >= remaining)
        q.error = `Sınır aşıldı: bir parfüme en fazla ${IMAGE_LIMITS.maxPerPerfume} görsel eklenebilir.`;
      else if (!ACCEPT.includes(f.type)) q.error = 'Yalnızca JPEG, PNG ve WebP yüklenebilir.';
      else if (f.size > IMAGE_LIMITS.maxBytes) q.error = 'Dosya 5 MB sınırını aşıyor.';
    });
    setUploads(queue);
    let added = 0;
    for (const [i, file] of files.entries()) {
      if (queue[i]!.error) continue;
      const res = await uploadOne(base, await shrinkIfNeeded(file), (p) =>
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: p } : x))),
      );
      if (res.ok) {
        added += 1;
        const body = res.body as { images: AdminImage[] };
        setImages(body.images);
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: 100, done: true } : x)));
      } else {
        const msg =
          res.status === 0
            ? 'Bağlantı kesildi; yükleme tamamlanamadı. Tekrar deneyin.'
            : res.status === 401
              ? 'Oturumunuzun süresi doldu. Tekrar giriş yapın.'
              : ((res.body as ApiErrorBody | null)?.hata?.mesaj ?? 'Yükleme başarısız oldu.');
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, error: msg } : x)));
      }
    }
    if (added > 0) {
      setMessage({
        kind: 'success',
        text: `${added} görsel yüklendi. Her görsel için alternatif metin yazmayı unutmayın.`,
      });
      router.refresh();
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const saveAlt = async (img: AdminImage, value: string) => {
    if (value.trim() === img.alt_text) return;
    setSavingAlt((s) => ({ ...s, [img.id]: 'saving' }));
    const res = await sendJson<{ images: AdminImage[] }>(`${base}/${img.id}`, 'PATCH', {
      altText: value,
    });
    if (res.ok) {
      setImages(res.data.images);
      setSavingAlt((s) => ({ ...s, [img.id]: 'saved' }));
      router.refresh();
    } else {
      setSavingAlt((s) => ({ ...s, [img.id]: 'error' }));
      setMessage({ kind: 'error', text: res.message });
    }
  };

  const setCover = async (img: AdminImage) => {
    const res = await sendJson<{ images: AdminImage[] }>(`${base}/${img.id}`, 'PATCH', {
      isCover: true,
    });
    if (res.ok) {
      setImages(res.data.images);
      setMessage({ kind: 'success', text: 'Kapak görseli değiştirildi.' });
      router.refresh();
    } else setMessage({ kind: 'error', text: res.message });
  };

  const persistOrder = async (next: AdminImage[], announce: string) => {
    const previous = images;
    setImages(next);
    const res = await sendJson<{ images: AdminImage[] }>(base, 'PUT', {
      order: next.map((i) => i.id),
    });
    if (res.ok) {
      setImages(res.data.images);
      setMessage({ kind: 'success', text: announce });
      router.refresh();
    } else {
      setImages(previous);
      setMessage({ kind: 'error', text: res.message });
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    void persistOrder(next, `Görsel ${index + 1}. sıradan ${target + 1}. sıraya taşındı.`);
    // Görsel uca ulaştıysa aynı yöndeki düğme pasifleşir; odak karşı yöndeki düğmeye geçer.
    const atEdge = target === 0 || target === next.length - 1;
    const dir = atEdge ? (delta < 0 ? 'asagi' : 'yukari') : delta < 0 ? 'yukari' : 'asagi';
    requestAnimationFrame(() => document.getElementById(`gorsel-${item!.id}-${dir}`)?.focus());
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = images.findIndex((i) => i.id === dragId);
    const to = images.findIndex((i) => i.id === targetId);
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    void persistOrder(next, `Görsel ${to + 1}. sıraya taşındı.`);
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    const res = await sendJson<{ images: AdminImage[] }>(`${base}/${toDelete.id}`, 'DELETE');
    setBusy(false);
    setToDelete(null);
    // Silinen görselin düğmesi kalmadığı için odak sonuç bildirimine taşınır.
    requestAnimationFrame(() => messageRef.current?.focus());
    if (res.ok) {
      setImages(res.data.images);
      setMessage({ kind: 'success', text: 'Görsel silindi.' });
      router.refresh();
    } else setMessage({ kind: 'error', text: res.message });
  };

  const onZoneDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
  };

  const missingAlt = images.filter((i) => i.alt_text.trim() === '').length;

  return (
    <section className="card stack" aria-labelledby="gorseller-baslik">
      <h2 id="gorseller-baslik" style={{ fontSize: 22, margin: 0 }}>
        Görseller ({images.length}/{IMAGE_LIMITS.maxPerPerfume})
      </h2>
      <p className="field-hint" style={{ margin: 0 }}>
        JPEG, PNG ya da WebP; dosya başına en fazla 5 MB, en az {IMAGE_LIMITS.minSide} piksel. Konum
        bilgisi dahil tüm meta veriler silinir. İlk sıradaki ya da yıldızla işaretlenen görsel
        kapaktır. Sıralamayı sürükleyerek ya da ok düğmeleriyle değiştirebilirsiniz.
      </p>

      <div role="status" aria-live="polite" ref={messageRef} tabIndex={-1}>
        {message ? (
          <StateMessage
            kind={message.kind}
            title={message.kind === 'error' ? 'İşlem yapılamadı' : 'Tamamlandı'}
          >
            {message.text}
          </StateMessage>
        ) : null}
      </div>

      {missingAlt > 0 ? (
        <StateMessage kind="warning" title="Alternatif metin eksik">
          {missingAlt} görselin alternatif metni boş. Görme engelli ziyaretçiler ve arama motorları
          için her görseli kısaca tarif edin; alternatif metni boş görsel varken parfüm
          yayınlanamaz.
        </StateMessage>
      ) : null}

      {images.length === 0 ? (
        <StateMessage kind="empty" title="Henüz görsel yok">
          Yayınlamak için en az bir görsel ekleyin.
        </StateMessage>
      ) : (
        <ol className="image-list" aria-label="Görsel sırası">
          {images.map((img, i) => {
            const altId = `alt-${img.id}`;
            const altState = savingAlt[img.id];
            return (
              <li
                key={img.id}
                className="image-item"
                draggable
                data-dragging={dragId === img.id}
                data-over={overId === img.id}
                onDragStart={(e) => {
                  setDragId(img.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setOverId(img.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(img.id);
                  setOverId(null);
                }}
              >
                <img
                  src={imageUrl(img.id, Number(img.widths.split(',')[0]) || 400)}
                  alt=""
                  width={96}
                  height={120}
                />
                <div className="stack" style={{ minWidth: 0 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>
                      <GripVertical
                        size={16}
                        aria-hidden="true"
                        className="handle"
                        style={{ display: 'inline', verticalAlign: 'middle' }}
                      />{' '}
                      {i + 1}. görsel
                      {img.is_cover ? (
                        <span className="badge badge-success" style={{ marginLeft: 8 }}>
                          Kapak
                        </span>
                      ) : null}
                    </span>
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        id={`gorsel-${img.id}-yukari`}
                        type="button"
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label={`${i + 1}. görseli yukarı taşı`}
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        id={`gorsel-${img.id}-asagi`}
                        type="button"
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => move(i, 1)}
                        disabled={i === images.length - 1}
                        aria-label={`${i + 1}. görseli aşağı taşı`}
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => setCover(img)}
                        disabled={img.is_cover === 1}
                        aria-label={`${i + 1}. görseli kapak yap`}
                        aria-pressed={img.is_cover === 1}
                      >
                        <Star
                          size={16}
                          aria-hidden="true"
                          fill={img.is_cover ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => setToDelete(img)}
                        aria-label={`${i + 1}. görseli sil`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor={altId}>
                      Alternatif metin{' '}
                      <span className="muted" style={{ fontWeight: 400 }}>
                        (zorunlu)
                      </span>
                    </label>
                    <input
                      id={altId}
                      className="input"
                      defaultValue={img.alt_text}
                      maxLength={200}
                      placeholder="Örnek: Amber tonlarında, altın kapaklı 100 ml şişe"
                      aria-invalid={img.alt_text.trim() === '' ? true : undefined}
                      aria-describedby={`${altId}-durum`}
                      onBlur={(e) => saveAlt(img, e.target.value)}
                    />
                    <span
                      id={`${altId}-durum`}
                      className={img.alt_text.trim() === '' ? 'field-error' : 'field-hint'}
                    >
                      {altState === 'saving'
                        ? 'Kaydediliyor…'
                        : altState === 'error'
                          ? 'Kaydedilemedi.'
                          : img.alt_text.trim() === ''
                            ? 'Alternatif metin boş.'
                            : altState === 'saved'
                              ? 'Kaydedildi.'
                              : 'Alandan çıktığınızda kaydedilir.'}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {remaining > 0 ? (
        <div
          className="dropzone"
          data-active={dropActive}
          onDragOver={(e) => {
            if (dragId) return;
            e.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={onZoneDrop}
        >
          <Upload size={28} aria-hidden="true" style={{ margin: '0 auto 8px' }} />
          <p style={{ marginBottom: 8 }}>Görselleri buraya sürükleyin ya da</p>
          <label className="btn btn-primary" htmlFor="gorsel-sec">
            Dosya seçin
          </label>
          <input
            ref={fileInput}
            id="gorsel-sec"
            type="file"
            accept={ACCEPT.join(',')}
            multiple
            className="visually-hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <p className="field-hint" style={{ marginTop: 8, marginBottom: 0 }}>
            {remaining} görsel daha ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <StateMessage kind="info" title="Görsel sınırına ulaşıldı">
          Bir parfüme en fazla {IMAGE_LIMITS.maxPerPerfume} görsel eklenebilir. Yeni görsel için
          önce birini silin.
        </StateMessage>
      )}

      {uploads.length > 0 ? (
        <ul className="stack" aria-label="Yüklemeler" style={{ listStyle: 'none', padding: 0 }}>
          {uploads.map((u, i) => (
            <li key={`${u.name}-${i}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ overflowWrap: 'anywhere' }}>{u.name}</span>
                <span className={u.error ? 'field-error' : 'muted'}>
                  {u.error ? 'Başarısız' : u.done ? 'Tamamlandı' : `%${u.progress}`}
                </span>
              </div>
              {!u.error ? (
                <progress
                  className="progress"
                  max={100}
                  value={u.progress}
                  aria-label={`${u.name} yükleme ilerlemesi`}
                />
              ) : null}
              {u.error ? (
                <p className="field-error" role="alert">
                  {u.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        title="Görsel silinsin mi?"
        body="Bu görsel kalıcı olarak silinir ve geri alınamaz."
        confirmLabel="Görseli sil"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
