'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bold, Heading3, Italic, List, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ErrorSummary, Field, describedBy, sendJson } from '@/components/ui/form';
import { StateMessage } from '@/components/ui/StateMessage';
import {
  CONCENTRATIONS,
  CONCENTRATION_LABELS,
  GENDERS,
  GENDER_LABELS,
  NOTE_TIERS,
  NOTE_TIER_LABELS,
  STOCK_LABELS,
  STOCK_STATUSES,
  type NoteTier,
} from '@/lib/shared/domain';
import { parsePriceInput, priceToInput } from '@/lib/shared/format';
import { fieldErrors, perfumeInputSchema } from '@/lib/shared/schemas';
import type { PerfumeDetail } from '@/lib/server/perfumes';
import { setDirty } from './dirty';

type Option = { id: number; name: string };

type FormValues = {
  name: string;
  slug: string;
  brandId: string;
  familyId: string;
  description: string;
  concentration: string;
  gender: string;
  stockStatus: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  allergens: string;
  seoTitle: string;
  seoDescription: string;
  notes: Record<NoteTier, string>;
  variants: Array<{ key: number; volume: string; price: string }>;
};

const LABELS: Record<string, string> = {
  name: 'Parfüm adı',
  slug: 'Kısa ad (adres)',
  brandId: 'Marka',
  familyId: 'Koku ailesi',
  description: 'Açıklama',
  concentration: 'Konsantrasyon',
  stockStatus: 'Stok durumu',
  status: 'Yayın durumu',
  seoTitle: 'SEO başlığı',
  seoDescription: 'SEO açıklaması',
  allergens: 'Alerjen ve içerik bilgisi',
  'notes.top': NOTE_TIER_LABELS.top,
  'notes.heart': NOTE_TIER_LABELS.heart,
  'notes.base': NOTE_TIER_LABELS.base,
};

function normalizeKey(key: string): string {
  const parts = key.split('.');
  if (parts[0] === 'notes') return parts.slice(0, 2).join('.');
  if (parts[0] === 'variants') return parts.slice(0, 3).join('.');
  return parts[0] ?? key;
}
const idFor = (key: string) => `pf-${normalizeKey(key).replace(/\./g, '-')}`;

function initialValues(p: PerfumeDetail | null): FormValues {
  let key = 0;
  return {
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    brandId: p ? String(p.brand.id) : '',
    familyId: p?.family ? String(p.family.id) : '',
    description: p?.descriptionMd ?? '',
    concentration: p?.concentration ?? 'EDP',
    gender: p?.gender ?? '',
    stockStatus: p?.stockStatus ?? 'in_stock',
    status: p?.status ?? 'draft',
    isFeatured: p?.isFeatured ?? false,
    allergens: p?.allergens ?? '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
    notes: {
      top: p?.notes.top.map((n) => n.name).join(', ') ?? '',
      heart: p?.notes.heart.map((n) => n.name).join(', ') ?? '',
      base: p?.notes.base.map((n) => n.name).join(', ') ?? '',
    },
    variants: (p?.variants.length ? p.variants : [{ volumeMl: 100, priceKurus: null }]).map(
      (v) => ({
        key: key++,
        volume: String(v.volumeMl),
        price: priceToInput(v.priceKurus),
      }),
    ),
  };
}

const splitNotes = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export function PerfumeForm({
  perfume,
  brands,
  families,
  noteNames,
  imageCount,
}: {
  perfume: PerfumeDetail | null;
  brands: Option[];
  families: Option[];
  noteNames: string[];
  imageCount: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => initialValues(perfume));
  const [updatedAt, setUpdatedAt] = useState(perfume?.updatedAt ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    kind: 'success' | 'error';
    title: string;
    text: string;
  } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const nextKey = useRef(100);
  const initial = useRef(JSON.stringify(initialValues(perfume)));

  useEffect(() => {
    setDirty(JSON.stringify(values) !== initial.current);
  }, [values]);
  useEffect(() => () => setDirty(false), []);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const err = (key: string) => errors[key];
  const aria = (key: string, hint = false) => ({
    id: idFor(key),
    'aria-invalid': err(key) ? true : undefined,
    'aria-describedby': describedBy(idFor(key), hint, err(key)),
  });

  const wrap = (before: string, after = before, linePrefix = false) => {
    const el = descRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || (linePrefix ? '' : 'metin');
    const insert = linePrefix
      ? `${s > 0 && value[s - 1] !== '\n' ? '\n' : ''}${before}${selected}`
      : `${before}${selected}${after}`;
    const next = value.slice(0, s) + insert + value.slice(e);
    set('description', next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + insert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const fail = (errs: Record<string, string>) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(errs)) {
      const nk = k === '_' ? '_' : normalizeKey(k);
      if (!normalized[nk]) normalized[nk] = v;
    }
    setErrors(normalized);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const priceErrors: Record<string, string> = {};
    // Tamamen boş satırlar önce formdan da çıkarılır; böylece hata numaraları ekrandaki satırlarla eşleşir.
    const filled = values.variants.filter((v) => v.volume.trim() !== '' || v.price.trim() !== '');
    if (filled.length !== values.variants.length) set('variants', filled);
    const variants = filled.map((v, i) => {
      const price = parsePriceInput(v.price);
      if (price === undefined)
        priceErrors[`variants.${i}.priceKurus`] = 'Fiyatı 1250 ya da 1.250,00 biçiminde yazın.';
      return {
        volumeMl: v.volume.trim() === '' ? NaN : Number(v.volume),
        priceKurus: price ?? null,
      };
    });
    const payload = {
      name: values.name,
      slug: values.slug.trim(),
      brandId: values.brandId === '' ? 0 : Number(values.brandId),
      familyId: values.familyId === '' ? null : Number(values.familyId),
      description: values.description,
      concentration: values.concentration,
      gender: values.gender === '' ? null : values.gender,
      stockStatus: values.stockStatus,
      status: values.status,
      isFeatured: values.isFeatured,
      allergens: values.allergens,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      notes: {
        top: splitNotes(values.notes.top),
        heart: splitNotes(values.notes.heart),
        base: splitNotes(values.notes.base),
      },
      variants,
    };
    const parsed = perfumeInputSchema.safeParse(payload);
    if (!parsed.success || Object.keys(priceErrors).length > 0) {
      return fail({ ...(parsed.success ? {} : fieldErrors(parsed.error)), ...priceErrors });
    }
    setBusy(true);
    const res = perfume
      ? await sendJson<{ id: number; slug: string; updatedAt: string }>(
          `/api/admin/parfumler/${perfume.id}`,
          'PUT',
          { ...payload, updatedAt },
        )
      : await sendJson<{ id: number; slug: string; updatedAt: string }>(
          '/api/admin/parfumler',
          'POST',
          payload,
        );
    setBusy(false);
    if (!res.ok) {
      if (res.status === 409) {
        setErrors({});
        setNotice({ kind: 'error', title: 'Çakışma: kaydedilmedi', text: res.message });
        requestAnimationFrame(() => noticeRef.current?.focus());
        return;
      }
      return fail({ ...(res.fields ?? {}), _: res.message });
    }
    setErrors({});
    initial.current = JSON.stringify(values);
    setDirty(false);
    if (!perfume) {
      router.push(`/admin/parfumler/${res.data.id}?olusturuldu=1`);
      return;
    }
    setUpdatedAt(res.data.updatedAt);
    set('slug', res.data.slug);
    initial.current = JSON.stringify({ ...values, slug: res.data.slug });
    setNotice({
      kind: 'success',
      title: 'Kaydedildi',
      text:
        values.status === 'published'
          ? 'Değişiklikler vitrinde yayında.'
          : 'Parfüm taslak olarak kaydedildi; vitrinde görünmez.',
    });
    requestAnimationFrame(() => noticeRef.current?.focus());
    router.refresh();
  };

  const canPublish = perfume !== null && imageCount > 0;

  return (
    <form onSubmit={onSubmit} noValidate className="form-layout">
      <div className="stack">
        <ErrorSummary
          ref={summaryRef}
          title="Kaydedilemedi. Lütfen şu alanları düzeltin:"
          errors={errors}
          labels={LABELS}
          idFor={idFor}
        />

        <fieldset className="stack">
          <legend>Temel bilgiler</legend>
          <Field id={idFor('name')} label={LABELS.name!} error={err('name')} required>
            <input
              className="input"
              {...aria('name')}
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={160}
              required
            />
          </Field>
          <div className="form-grid two">
            <Field
              id={idFor('brandId')}
              label={LABELS.brandId!}
              error={err('brandId')}
              required
              hint={brands.length === 0 ? 'Önce Markalar ekranından marka ekleyin.' : undefined}
            >
              <select
                className="select"
                {...aria('brandId', brands.length === 0)}
                value={values.brandId}
                onChange={(e) => set('brandId', e.target.value)}
                required
              >
                <option value="">Seçin</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={idFor('familyId')} label={LABELS.familyId!} error={err('familyId')}>
              <select
                className="select"
                {...aria('familyId')}
                value={values.familyId}
                onChange={(e) => set('familyId', e.target.value)}
              >
                <option value="">Belirtilmedi</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid three">
            <Field
              id={idFor('concentration')}
              label={LABELS.concentration!}
              error={err('concentration')}
              required
            >
              <select
                className="select"
                {...aria('concentration')}
                value={values.concentration}
                onChange={(e) => set('concentration', e.target.value)}
              >
                {CONCENTRATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === 'PARFUM' ? CONCENTRATION_LABELS[c] : `${CONCENTRATION_LABELS[c]} (${c})`}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={idFor('gender')} label="Kullanım">
              <select
                className="select"
                {...aria('gender')}
                value={values.gender}
                onChange={(e) => set('gender', e.target.value)}
              >
                <option value="">Belirtilmedi</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id={idFor('stockStatus')}
              label={LABELS.stockStatus!}
              error={err('stockStatus')}
              required
            >
              <select
                className="select"
                {...aria('stockStatus')}
                value={values.stockStatus}
                onChange={(e) => set('stockStatus', e.target.value)}
              >
                {STOCK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STOCK_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="stack">
          <legend>Açıklama</legend>
          <Field
            id={idFor('description')}
            label={LABELS.description!}
            error={err('description')}
            required
            hint="Ürün sayfasında görsellerin altında gösterilir. **kalın**, *italik*, satır başında - ile liste ve ### ile ara başlık kullanabilirsiniz. HTML kabul edilmez."
          >
            <div
              className="md-toolbar"
              role="toolbar"
              aria-label="Biçimlendirme"
              aria-controls={idFor('description')}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => wrap('**')}
                aria-label="Kalın"
              >
                <Bold size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => wrap('*')}
                aria-label="İtalik"
              >
                <Italic size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => wrap('- ', '', true)}
                aria-label="Madde işaretli liste"
              >
                <List size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => wrap('### ', '', true)}
                aria-label="Ara başlık"
              >
                <Heading3 size={16} aria-hidden="true" />
              </button>
            </div>
            <textarea
              ref={descRef}
              className="textarea"
              {...aria('description', true)}
              style={{ minHeight: 220 }}
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={10000}
            />
          </Field>
        </fieldset>

        <fieldset className="stack">
          <legend>Nota piramidi</legend>
          <p className="field-hint" style={{ margin: 0 }}>
            Notaları virgülle ayırın. Listede olmayan notalar kaydederken otomatik eklenir.
          </p>
          <datalist id="nota-listesi">
            {noteNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {NOTE_TIERS.map((tier) => (
            <Field
              key={tier}
              id={idFor(`notes.${tier}`)}
              label={NOTE_TIER_LABELS[tier]}
              error={err(`notes.${tier}`)}
            >
              <input
                className="input"
                {...aria(`notes.${tier}`)}
                list="nota-listesi"
                value={values.notes[tier]}
                onChange={(e) => set('notes', { ...values.notes, [tier]: e.target.value })}
                placeholder="Örnek: Bergamot, Pembe biber"
              />
            </Field>
          ))}
        </fieldset>

        <fieldset className="stack" id={idFor('variants')} tabIndex={-1}>
          <legend>Hacim ve fiyat seçenekleri</legend>
          <p className="field-hint" style={{ margin: 0 }}>
            Fiyatı boş bırakırsanız vitrinde &quot;Fiyat için iletişime geçin&quot; yazar. Örnek
            fiyat: 1.250,00
          </p>
          {err('variants') ? <p className="field-error">{err('variants')}</p> : null}
          {values.variants.map((v, i) => (
            <div key={v.key} className="variant-row">
              <Field
                id={idFor(`variants.${i}.volumeMl`)}
                label={`${i + 1}. hacim (ml)`}
                error={err(`variants.${i}.volumeMl`)}
              >
                <input
                  className="input"
                  {...aria(`variants.${i}.volumeMl`)}
                  inputMode="numeric"
                  value={v.volume}
                  onChange={(e) =>
                    set(
                      'variants',
                      values.variants.map((x) =>
                        x.key === v.key ? { ...x, volume: e.target.value } : x,
                      ),
                    )
                  }
                />
              </Field>
              <Field
                id={idFor(`variants.${i}.priceKurus`)}
                label={`${i + 1}. fiyat (₺)`}
                error={err(`variants.${i}.priceKurus`)}
              >
                <input
                  className="input"
                  {...aria(`variants.${i}.priceKurus`)}
                  inputMode="decimal"
                  value={v.price}
                  onChange={(e) =>
                    set(
                      'variants',
                      values.variants.map((x) =>
                        x.key === v.key ? { ...x, price: e.target.value } : x,
                      ),
                    )
                  }
                />
              </Field>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={`${i + 1}. seçeneği kaldır`}
                onClick={() =>
                  set(
                    'variants',
                    values.variants.filter((x) => x.key !== v.key),
                  )
                }
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
          {values.variants.length < 10 ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                set('variants', [
                  ...values.variants,
                  { key: nextKey.current++, volume: '', price: '' },
                ])
              }
            >
              <Plus size={16} aria-hidden="true" />
              Seçenek ekle
            </button>
          ) : null}
        </fieldset>

        <fieldset className="stack">
          <legend>Arama motoru ve ek bilgiler</legend>
          <Field
            id={idFor('slug')}
            label={LABELS.slug!}
            error={err('slug')}
            hint="Boş bırakırsanız addan üretilir. Yalnızca küçük harf, rakam ve tire."
          >
            <input
              className="input"
              {...aria('slug', true)}
              value={values.slug}
              onChange={(e) => set('slug', e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field
            id={idFor('seoTitle')}
            label={LABELS.seoTitle!}
            error={err('seoTitle')}
            hint="Boş bırakılırsa marka, ad ve konsantrasyondan üretilir. En fazla 70 karakter."
          >
            <input
              className="input"
              {...aria('seoTitle', true)}
              value={values.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
              maxLength={70}
            />
          </Field>
          <Field
            id={idFor('seoDescription')}
            label={LABELS.seoDescription!}
            error={err('seoDescription')}
            hint="Boş bırakılırsa açıklamanın başından üretilir. En fazla 170 karakter."
          >
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              {...aria('seoDescription', true)}
              value={values.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
              maxLength={170}
            />
          </Field>
          <Field
            id={idFor('allergens')}
            label={LABELS.allergens!}
            error={err('allergens')}
            hint="İsteğe bağlı. Ürün etiketindeki bileşen ve alerjen listesini aynen yazın."
          >
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              {...aria('allergens', true)}
              value={values.allergens}
              onChange={(e) => set('allergens', e.target.value)}
              maxLength={2000}
            />
          </Field>
        </fieldset>
      </div>

      <aside className="form-aside card stack" aria-label="Yayın ve kaydetme">
        <div ref={noticeRef} tabIndex={-1}>
          {notice ? (
            <StateMessage kind={notice.kind} title={notice.title} live>
              {notice.text}
              {notice.kind === 'error' && perfume ? (
                <p style={{ marginTop: 8 }}>
                  <a href={`/admin/parfumler/${perfume.id}`} target="_blank" rel="noopener">
                    Güncel hâli yeni sekmede aç
                  </a>
                </p>
              ) : null}
            </StateMessage>
          ) : null}
        </div>
        <fieldset>
          <legend>{LABELS.status}</legend>
          <label className="checkbox">
            <input
              type="radio"
              name="status"
              id={idFor('status')}
              checked={values.status === 'draft'}
              onChange={() => set('status', 'draft')}
              aria-describedby={err('status') ? 'pf-status-hata' : undefined}
            />
            Taslak (vitrinde görünmez)
          </label>
          <label className="checkbox">
            <input
              type="radio"
              name="status"
              checked={values.status === 'published'}
              onChange={() => set('status', 'published')}
              disabled={!canPublish && values.status !== 'published'}
              aria-describedby="yayin-ipucu"
            />
            Yayında
          </label>
          <p id="yayin-ipucu" className="field-hint" style={{ margin: 0 }}>
            {canPublish
              ? 'Yayınlamak için tüm görsellerin alternatif metni dolu olmalıdır.'
              : 'Yayınlamak için önce taslak olarak kaydedin ve en az bir görsel ekleyin.'}
          </p>
          {err('status') ? (
            <p className="field-error" id="pf-status-hata">
              {err('status')}
            </p>
          ) : null}
        </fieldset>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => set('isFeatured', e.target.checked)}
          />
          Ana sayfada öne çıkar
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Kaydediliyor…
              </>
            ) : perfume ? (
              'Kaydet'
            ) : (
              'Taslak olarak oluştur'
            )}
          </button>
          {perfume ? (
            <Link
              className="btn btn-ghost"
              href={`/admin/parfumler/${perfume.id}/onizleme`}
              target="_blank"
            >
              Önizle<span className="visually-hidden"> (yeni sekmede açılır)</span>
            </Link>
          ) : null}
        </div>
        {perfume && perfume.status === 'published' && !perfume.deletedAt ? (
          <a href={`/parfum/${perfume.slug}`} target="_blank" rel="noopener">
            Vitrindeki sayfayı aç<span className="visually-hidden"> (yeni sekmede açılır)</span>
          </a>
        ) : null}
      </aside>
    </form>
  );
}
