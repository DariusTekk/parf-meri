'use client';

import { StateMessage } from '@/components/ui/StateMessage';

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <h1>Bir sorun oluştu</h1>
      <StateMessage
        kind="error"
        title="Sayfa yüklenemedi"
        live
        action={
          <button type="button" className="btn btn-primary" onClick={reset}>
            Tekrar dene
          </button>
        }
      >
        Sunucuya ulaşılamamış ya da beklenmeyen bir hata oluşmuş olabilir. Bağlantınızı kontrol edip
        tekrar deneyin.
      </StateMessage>
    </>
  );
}
