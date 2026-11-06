'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Picture, imageUrl } from '@/components/ui/Picture';
import type { ImageInfo } from '@/lib/shared/types';
import { t } from '@/i18n/tr';

/** Ürün galerisi: küçük resimler ok tuşlarıyla gezilebilir (roving tabindex). */
export function Gallery({ images, name }: { images: ImageInfo[]; name: string }) {
  const [index, setIndex] = useState(0);
  const thumbs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = images[index];

  if (!current) {
    return (
      <div className="gallery-main">
        <span className="muted">{t.product.noImage}</span>
      </div>
    );
  }

  const move = (next: number) => {
    const n = (next + images.length) % images.length;
    setIndex(n);
    thumbs.current[n]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(images.length - 1);
    }
  };

  return (
    <section aria-label={`${name}: ${t.product.gallery}`}>
      <div className="gallery-main">
        <Picture
          key={current.id}
          image={current}
          sizes="(min-width: 1200px) 620px, (min-width: 900px) 52vw, 100vw"
          priority={index === 0}
        />
      </div>
      <p className="visually-hidden" aria-live="polite">
        {t.product.imageOf(index + 1, images.length)}
      </p>
      {images.length > 1 ? (
        <ul className="gallery-thumbs" aria-label={t.product.gallery}>
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                ref={(el) => {
                  thumbs.current[i] = el;
                }}
                type="button"
                className="gallery-thumb"
                aria-current={i === index ? 'true' : undefined}
                aria-label={`${t.product.imageOf(i + 1, images.length)}: ${img.alt}`}
                tabIndex={i === index ? 0 : -1}
                onClick={() => setIndex(i)}
                onKeyDown={onKey}
              >
                <img
                  src={imageUrl(img.id, img.widths[0] ?? img.width)}
                  alt=""
                  width={64}
                  height={80}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
