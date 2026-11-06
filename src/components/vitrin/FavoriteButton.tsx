'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/i18n/tr';
import { toggleFavorite, useFavorites } from './favorites';

export function FavoriteButton({
  slug,
  name,
  variant = 'icon',
}: {
  slug: string;
  name: string;
  variant?: 'icon' | 'full';
}) {
  const favorites = useFavorites();
  const [failed, setFailed] = useState(false);
  const active = favorites.includes(slug);
  const label = `${active ? t.favorites.remove : t.favorites.add}: ${name}`;

  const onClick = () => {
    setFailed(!toggleFavorite(slug));
  };

  if (variant === 'full') {
    return (
      <span>
        <button type="button" className="btn btn-secondary" aria-pressed={active} onClick={onClick}>
          <Heart size={20} aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
          {active ? t.favorites.remove : t.favorites.add}
        </button>
        {failed ? (
          <span role="alert" className="field-error" style={{ marginTop: 4 }}>
            {t.favorites.storageError}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <>
      <span role="status" className="visually-hidden">
        {failed ? t.favorites.storageError : ''}
      </span>
      <button
        type="button"
        className="btn btn-secondary btn-icon pcard-fav"
        aria-pressed={active}
        aria-label={label}
        title={failed ? t.favorites.storageError : label}
        onClick={onClick}
      >
        <Heart size={20} aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
      </button>
    </>
  );
}
