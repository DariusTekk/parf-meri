import { AlertTriangle, CheckCircle2, Info, PackageOpen, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type Kind = 'empty' | 'error' | 'success' | 'warning' | 'info';

const ICONS = {
  empty: PackageOpen,
  error: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

/** Boş, hata, başarı ve uyarı durumları için ortak kutu. */
export function StateMessage({
  kind,
  title,
  children,
  action,
  id,
  tabIndex,
  live,
}: {
  kind: Kind;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  id?: string;
  tabIndex?: number;
  live?: boolean;
}) {
  const Icon = ICONS[kind];
  const role = live ? (kind === 'error' ? 'alert' : 'status') : undefined;
  return (
    <div className={`state state-${kind}`} id={id} tabIndex={tabIndex} role={role}>
      <Icon className="state-icon" aria-hidden="true" size={kind === 'empty' ? 40 : 22} />
      <div>
        <p className="state-title">{title}</p>
        {children ? <div className={kind === 'empty' ? 'muted' : undefined}>{children}</div> : null}
        {action ? (
          <div
            className="row"
            style={{ marginTop: 12, justifyContent: kind === 'empty' ? 'center' : undefined }}
          >
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row" role="status">
      <span className="spinner" aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="visually-hidden">Yükleniyor</span>}
    </span>
  );
}

export function Skeleton({
  height,
  width = '100%',
  radius,
}: {
  height: number | string;
  width?: number | string;
  radius?: number;
}) {
  return (
    <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="visually-hidden">Parfümler yükleniyor</span>
      <div className="grid">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="pcard" aria-hidden="true">
            <div className="pcard-media skeleton" style={{ borderRadius: 0 }} />
            <div className="pcard-body">
              <Skeleton height={14} width="50%" />
              <Skeleton height={20} width="85%" />
              <Skeleton height={18} width="40%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
