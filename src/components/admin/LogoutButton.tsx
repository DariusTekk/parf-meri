'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sendJson } from '@/components/ui/form';
import { confirmLeave } from './dirty';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={async () => {
          if (!confirmLeave()) return;
          setBusy(true);
          const res = await sendJson('/api/oturum/cikis', 'POST');
          if (res.ok || res.status === 401) {
            router.replace('/admin/giris');
            router.refresh();
            return;
          }
          setBusy(false);
          setError(res.message);
        }}
      >
        <LogOut size={16} aria-hidden="true" />
        Çıkış yap
      </button>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
