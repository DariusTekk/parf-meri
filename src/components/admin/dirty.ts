'use client';

let dirty = false;

const MESSAGE =
  'Kaydedilmemiş değişiklikleriniz var. Sayfadan çıkarsanız bu değişiklikler kaybolur. Devam edilsin mi?';

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
}

/** Formda kaydedilmemiş değişiklik var mı; sekme kapanırken ve panel içi gezinmede uyarır. */
export function setDirty(value: boolean) {
  if (value === dirty) return;
  dirty = value;
  if (value) window.addEventListener('beforeunload', onBeforeUnload);
  else window.removeEventListener('beforeunload', onBeforeUnload);
}

export function confirmLeave(): boolean {
  if (!dirty) return true;
  const ok = window.confirm(MESSAGE);
  if (ok) setDirty(false);
  return ok;
}
