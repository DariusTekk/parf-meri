'use client';

import { useEffect, useRef } from 'react';

/** Yerel <dialog> ile onay penceresi: odak içeride tutulur, Esc ile kapanır. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="onay-baslik"
      aria-describedby="onay-metin"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="onay-baslik" style={{ fontSize: 22 }}>
        {title}
      </h2>
      <p id="onay-metin">{body}</p>
      <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} autoFocus>
          Vazgeç
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
