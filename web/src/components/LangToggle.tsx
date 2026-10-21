'use client';

import { LOCALE_NAMES, LOCALES } from '@/lib/i18n';

const NARROW: Record<string, string> = { ko: '한' }; // phone widths: the top bar has no room for 한국어
import { setLocale, useCopy, useLocale } from './useLocale';

/** EN | 한국어 in the top bar; on phones just the other language, as 한 or EN. */
export function LangToggle() {
  const locale = useLocale();
  const c = useCopy();
  return (
    <div className="gw-lang" role="group" aria-label={c.language}>
      {LOCALES.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={locale === l} aria-label={LOCALE_NAMES[l]} onClick={() => setLocale(l)}>
          <span className="gw-lang-wide">{LOCALE_NAMES[l]}</span><span className="gw-lang-narrow">{NARROW[l] ?? LOCALE_NAMES[l]}</span>
        </button>
      ))}
    </div>
  );
}
