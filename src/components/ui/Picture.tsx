import type { ImageInfo } from '@/lib/shared/types';

export function imageUrl(id: string, width: number, ext: 'webp' | 'avif' = 'webp') {
  return `/gorsel/${id}/${width}.${ext}`;
}

/** Sunucuda üretilmiş genişliklerden srcset kuran duyarlı görsel. */
export function Picture({
  image,
  sizes,
  priority = false,
  className,
}: {
  image: ImageInfo;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const widths = image.widths.length > 0 ? image.widths : [image.width];
  const set = (ext: 'webp' | 'avif') =>
    widths.map((w) => `${imageUrl(image.id, w, ext)} ${w}w`).join(', ');
  const fallbackWidth = widths.find((w) => w >= 800) ?? widths[widths.length - 1] ?? image.width;
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={imageUrl(image.id, fallbackWidth)}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        className={className}
      />
    </picture>
  );
}
