import { Skeleton } from '@/components/ui/StateMessage';

export default function PanelLoading() {
  return (
    <div role="status" aria-live="polite" className="stack">
      <span className="visually-hidden">Yükleniyor</span>
      <Skeleton height={40} width={260} />
      <Skeleton height={44} />
      <Skeleton height={320} />
    </div>
  );
}
