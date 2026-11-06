'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/i18n/tr';

/** Tarayıcının yerel paylaşım menüsü; yoksa bağlantıyı panoya kopyalar. Üçüncü taraf betik yok. */
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  const onClick = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage(t.product.copied);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(`Paylaşılamadı. Adres: ${url}`);
    }
  };
  return (
    <span>
      <button type="button" className="btn btn-ghost" onClick={onClick}>
        <Share2 size={20} aria-hidden="true" />
        {t.product.share}
      </button>
      <span role="status" className="muted" style={{ fontSize: 14, marginLeft: 8 }}>
        {message}
      </span>
    </span>
  );
}
