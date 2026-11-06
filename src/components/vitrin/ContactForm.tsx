'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ErrorSummary, Field, describedBy, sendJson } from '@/components/ui/form';
import { StateMessage } from '@/components/ui/StateMessage';
import { contactSchema, fieldErrors } from '@/lib/shared/schemas';
import { t } from '@/i18n/tr';

const LABELS = { name: t.contact.name, contact: t.contact.contact, message: t.contact.message };
const idFor = (key: string) => `iletisim-${key}`;

export function ContactForm({ perfume }: { perfume?: { slug: string; label: string } }) {
  const [values, setValues] = useState({
    name: '',
    contact: '',
    message: perfume ? `${perfume.label} hakkında bilgi almak istiyorum.` : '',
    website: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const summaryRef = useRef<HTMLDivElement>(null);

  const update = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const showErrors = (errs: Record<string, string>) => {
    setErrors(errs);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...values, perfumeSlug: perfume?.slug };
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      showErrors(fieldErrors(parsed.error));
      return;
    }
    setStatus('sending');
    const res = await sendJson('/api/iletisim', 'POST', payload);
    if (res.ok) {
      setStatus('sent');
      setErrors({});
      return;
    }
    setStatus('idle');
    showErrors({ ...(res.fields ?? {}), _: res.message });
  };

  if (status === 'sent') {
    return (
      <div ref={(el) => el?.focus()} tabIndex={-1}>
        <StateMessage kind="success" title={t.contact.successTitle} live>
          {t.contact.successBody}
        </StateMessage>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="stack" aria-describedby="kvkk-not">
      <ErrorSummary
        ref={summaryRef}
        title={t.contact.errorSummary}
        errors={errors}
        labels={LABELS}
        idFor={idFor}
      />
      {perfume ? (
        <p>
          {t.contact.about}: <strong>{perfume.label}</strong>
        </p>
      ) : null}
      <Field id={idFor('name')} label={t.contact.name} error={errors.name} required>
        <input
          id={idFor('name')}
          className="input"
          autoComplete="name"
          value={values.name}
          onChange={update('name')}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(idFor('name'), false, errors.name)}
          maxLength={100}
          required
        />
      </Field>
      <Field
        id={idFor('contact')}
        label={t.contact.contact}
        hint={t.contact.contactHint}
        error={errors.contact}
        required
      >
        <input
          id={idFor('contact')}
          className="input"
          autoComplete="email"
          value={values.contact}
          onChange={update('contact')}
          aria-invalid={errors.contact ? true : undefined}
          aria-describedby={describedBy(idFor('contact'), true, errors.contact)}
          maxLength={120}
          required
        />
      </Field>
      <Field id={idFor('message')} label={t.contact.message} error={errors.message} required>
        <textarea
          id={idFor('message')}
          className="textarea"
          value={values.message}
          onChange={update('message')}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy(idFor('message'), false, errors.message)}
          maxLength={2000}
          required
        />
      </Field>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
        <label htmlFor="iletisim-website">Web siteniz</label>
        <input
          id="iletisim-website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={update('website')}
        />
      </div>
      <p id="kvkk-not" className="field-hint">
        {t.contact.kvkk} <Link href="/kvkk-aydinlatma">{t.contact.kvkkLink}</Link>.
      </p>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'sending'}
        aria-disabled={status === 'sending'}
      >
        {status === 'sending' ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {t.contact.sending}
          </>
        ) : (
          t.contact.send
        )}
      </button>
    </form>
  );
}
