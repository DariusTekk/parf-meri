'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ErrorSummary, Field, describedBy, sendJson } from '@/components/ui/form';
import { StateMessage } from '@/components/ui/StateMessage';
import { fieldErrors, settingsSchema, type SiteSettings } from '@/lib/shared/schemas';
import { setDirty } from './dirty';

const FIELDS: Array<{
  key: keyof SiteSettings;
  label: string;
  hint?: string;
  multiline?: boolean;
  type?: string;
}> = [
  { key: 'siteName', label: 'Site adı', hint: 'Başlıkta, sekme adında ve alt bilgide görünür.' },
  { key: 'tagline', label: 'Değer önerisi', hint: 'Ana sayfanın ana başlığı. Tek cümle.' },
  {
    key: 'heroText',
    label: 'Ana sayfa açıklaması',
    hint: 'Ana başlığın altındaki kısa metin.',
    multiline: true,
  },
  {
    key: 'aboutText',
    label: 'Hakkımızda metni',
    hint: 'Hakkımızda sayfasında gösterilir. **kalın** ve liste kullanabilirsiniz.',
    multiline: true,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp numarası',
    hint: 'Ülke koduyla, yalnızca rakam: 905551112233. Boşsa WhatsApp düğmeleri gizlenir.',
  },
  { key: 'phone', label: 'Telefon', hint: 'Gösterildiği gibi yazın, örneğin 0212 000 00 00.' },
  { key: 'email', label: 'E-posta', type: 'email' },
  { key: 'address', label: 'Adres', multiline: true },
  { key: 'workingHours', label: 'Çalışma saatleri', hint: 'Örnek: Hafta içi 10.00-19.00' },
  { key: 'instagramUrl', label: 'Instagram adresi', hint: 'https://instagram.com/kullaniciadi' },
  {
    key: 'dataControllerName',
    label: 'Veri sorumlusu unvanı',
    hint: 'KVKK aydınlatma metninde görünür: şahıs adı ya da şirket unvanı.',
  },
];

const LABELS = Object.fromEntries(FIELDS.map((f) => [f.key, f.label]));
const idFor = (k: string) => `ayar-${k}`;

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const base = useRef(JSON.stringify(initial));
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDirty(JSON.stringify(values) !== base.current);
  }, [values]);
  useEffect(() => () => setDirty(false), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setBusy(true);
    const res = await sendJson('/api/admin/ayarlar', 'PUT', parsed.data);
    setBusy(false);
    if (!res.ok) {
      setErrors({ ...(res.fields ?? {}), _: res.message });
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setErrors({});
    base.current = JSON.stringify(values);
    setDirty(false);
    setSaved(true);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="stack" style={{ maxWidth: 760 }}>
      <ErrorSummary
        ref={summary}
        title="Kaydedilemedi. Lütfen şu alanları düzeltin:"
        errors={errors}
        labels={LABELS}
        idFor={idFor}
      />
      {FIELDS.map((f) => {
        const id = idFor(f.key);
        const common = {
          id,
          className: f.multiline ? 'textarea' : 'input',
          value: values[f.key],
          'aria-invalid': errors[f.key] ? true : undefined,
          'aria-describedby': describedBy(id, Boolean(f.hint), errors[f.key]),
          onChange: (e: { target: { value: string } }) =>
            setValues((v) => ({ ...v, [f.key]: e.target.value })),
        };
        return (
          <Field
            key={f.key}
            id={id}
            label={f.label}
            hint={f.hint}
            error={errors[f.key]}
            required={f.key === 'siteName' || f.key === 'tagline'}
          >
            {f.multiline ? (
              <textarea {...common} style={{ minHeight: f.key === 'aboutText' ? 200 : 90 }} />
            ) : (
              <input {...common} type={f.type ?? 'text'} />
            )}
          </Field>
        );
      })}
      <div role="status" aria-live="polite">
        {saved ? (
          <StateMessage kind="success" title="Kaydedildi">
            Değişiklikler sitede yayında.
          </StateMessage>
        ) : null}
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ alignSelf: 'flex-start' }}
        disabled={busy}
      >
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Kaydediliyor…
          </>
        ) : (
          'Kaydet'
        )}
      </button>
    </form>
  );
}
