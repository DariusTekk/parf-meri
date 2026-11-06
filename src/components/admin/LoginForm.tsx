'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { ErrorSummary, Field, describedBy, sendJson } from '@/components/ui/form';
import { StateMessage } from '@/components/ui/StateMessage';
import { fieldErrors, loginSchema } from '@/lib/shared/schemas';

const LABELS = { email: 'E-posta', password: 'Parola' };
const idFor = (k: string) => `giris-${k}`;

export function LoginForm({ sessionExpired }: { sessionExpired: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const summary = useRef<HTMLDivElement>(null);

  const fail = (errs: Record<string, string>) => {
    setErrors(errs);
    requestAnimationFrame(() => summary.current?.focus());
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return fail(fieldErrors(parsed.error));
    setBusy(true);
    const res = await sendJson('/api/oturum/giris', 'POST', parsed.data);
    if (res.ok) {
      setDone(true);
      router.replace('/admin');
      router.refresh();
      return;
    }
    setBusy(false);
    setPassword('');
    fail({ _: res.status === 401 ? 'E-posta adresi ya da parola hatalı.' : res.message });
  };

  if (done)
    return (
      <StateMessage kind="success" title="Giriş başarılı" live>
        Panele yönlendiriliyorsunuz…
      </StateMessage>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="stack">
      {sessionExpired && Object.keys(errors).length === 0 ? (
        <StateMessage kind="info" title="Oturum gerekli">
          Devam etmek için giriş yapın. Oturumunuzun süresi dolmuş olabilir.
        </StateMessage>
      ) : null}
      <ErrorSummary
        ref={summary}
        title="Giriş yapılamadı"
        errors={errors}
        labels={LABELS}
        idFor={idFor}
      />
      <Field id={idFor('email')} label="E-posta" error={errors.email}>
        <input
          id={idFor('email')}
          type="email"
          className="input"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(idFor('email'), false, errors.email)}
          required
        />
      </Field>
      <Field id={idFor('password')} label="Parola" error={errors.password}>
        <input
          id={idFor('password')}
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy(idFor('password'), false, errors.password)}
          required
        />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Giriş yapılıyor…
          </>
        ) : (
          'Giriş yap'
        )}
      </button>
    </form>
  );
}
