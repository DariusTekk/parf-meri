'use client';

import { StateMessage } from '@/components/ui/StateMessage';
import { t } from '@/i18n/tr';

export default function VitrinError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container section">
      <h1>{t.error.title}</h1>
      <StateMessage
        kind="error"
        title={t.error.title}
        live
        action={
          <button type="button" className="btn btn-primary" onClick={reset}>
            {t.common.retry}
          </button>
        }
      >
        {t.error.body}
      </StateMessage>
    </div>
  );
}
