import { CardGridSkeleton, Skeleton } from '@/components/ui/StateMessage';

export default function CatalogLoading() {
  return (
    <div className="container section-tight">
      <Skeleton height={48} width={220} />
      <div style={{ height: 16 }} />
      <Skeleton height={44} />
      <div style={{ height: 24 }} />
      <CardGridSkeleton count={8} />
    </div>
  );
}
