'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'favoriler';
const EVENT = 'favoriler-degisti';
const MAX = 50;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

let cache: { raw: string | null; list: string[] } = { raw: null, list: [] };

function snapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) cache = { raw, list: read() };
  return cache.list;
}

const EMPTY: string[] = [];

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, callback);
  };
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function storageAvailable(): boolean {
  try {
    const probe = '__deneme__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Favori ekler ya da çıkarır; depolama kullanılamıyorsa false döner. */
export function toggleFavorite(slug: string): boolean {
  try {
    const list = read();
    const next = list.includes(slug)
      ? list.filter((s) => s !== slug)
      : [slug, ...list].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}
