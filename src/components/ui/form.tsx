'use client';

import { AlertCircle } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';

export function describedBy(id: string, hint?: string | boolean, error?: string) {
  const ids = [hint ? `${id}-ipucu` : null, error ? `${id}-hata` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** Etiket, ipucu ve hata mesajını alana bağlayan sarmalayıcı. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="muted" style={{ fontWeight: 400 }}>
            {' '}
            (zorunlu)
          </span>
        ) : null}
      </label>
      {hint ? (
        <span className="field-hint" id={`${id}-ipucu`}>
          {hint}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="field-error" id={`${id}-hata`}>
          <AlertCircle size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 3 }} />
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** Gönderim hatasında odak alan hata özeti; her madde ilgili alana bağlantıdır. */
export const ErrorSummary = forwardRef<
  HTMLDivElement,
  {
    title: string;
    errors: Record<string, string>;
    labels: Record<string, string>;
    idFor: (key: string) => string;
  }
>(function ErrorSummary({ title, errors, labels, idFor }, ref) {
  const entries = Object.entries(errors).filter(([k]) => k !== '_');
  if (entries.length === 0 && !errors._) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="state state-error"
      role="alert"
      aria-labelledby="hata-ozeti-baslik"
    >
      <AlertCircle className="state-icon" aria-hidden="true" size={22} />
      <div>
        <p className="state-title" id="hata-ozeti-baslik">
          {title}
        </p>
        {errors._ ? <p>{errors._}</p> : null}
        {entries.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {entries.map(([key, message]) => (
              <li key={key}>
                <a href={`#${idFor(key)}`}>
                  {labels[key] ? `${labels[key]}: ` : ''}
                  {message}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
});

export type ApiErrorBody = {
  hata?: { kod?: string; mesaj?: string; alanlar?: Record<string, string> };
};

/** Panel ve form istekleri için ortak fetch: ağ hatası, oturum düşmesi ve JSON hataları Türkçe. */
export async function sendJson<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; fields?: Record<string, string> }
> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-istek': 'panel' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message:
        'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin. Girdiğiniz bilgiler bu sayfada duruyor.',
    };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (res.ok) return { ok: true, data: json as T };
  const err = (json as ApiErrorBody | null)?.hata;
  let message = err?.mesaj ?? 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  if (res.status === 401)
    message =
      'Oturumunuzun süresi doldu. Yeni sekmede tekrar giriş yapıp bu sayfaya dönerek kaydedebilirsiniz; girdiğiniz bilgiler bu sayfada duruyor.';
  return { ok: false, status: res.status, message, fields: err?.alanlar };
}
