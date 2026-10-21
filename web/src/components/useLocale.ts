'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { COPY, type Copy, type Locale } from '@/lib/i18n';

// The visitor's language: what they picked (localStorage), else English, whatever the browser's
// language. The server always renders English; a saved choice applies after hydration.
const KEY = 'gw-lang';
const listeners = new Set<() => void>();

function read(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'ko') return v;
  } catch {
    // storage blocked: English
  }
  return 'en';
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => 'en');
}

export function setLocale(l: Locale) {
  try { localStorage.setItem(KEY, l); } catch { /* the choice lasts for this page only */ }
  listeners.forEach((cb) => cb());
}

/** The copy for the visitor's language. */
export const useCopy = (): Copy => COPY[useLocale()];

/** Keeps <html lang> in step with the language (rendered once, in the root layout). */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return null;
}
