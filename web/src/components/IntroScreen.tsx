'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { ADDRESS_RE, fmtShort } from '@/lib/wrapped';
import Link from 'next/link';
import { AdenaIcon } from './AdenaIcon';
import { LiveTicker } from './LiveTicker';
import { SeasonCountdown } from './SeasonCountdown';
import { Pill, Wordmark } from './pixel';
import { useCopy } from './useLocale';
import { useHydrated } from './useReducedMotion';
import { Footer, Nav, Starfield } from './web';

const RISE = (delay: number) => `gwRise 640ms cubic-bezier(.2,.8,.2,1) ${delay}ms both`;

interface AdenaProvider {
  AddEstablish(name: string): Promise<unknown>;
  GetAccount(): Promise<{ status?: string; data?: { address?: string } }>;
}

export function IntroScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [addr, setAddr] = useState('');
  const [err, setErr] = useState('');
  const [final, setFinal] = useState(false); // from the ticker: the season is over
  const c = useCopy();
  const season = CONFIG.CURRENT_SEASON;
  const seasonPill = `MAINNET ${season.id.toUpperCase()} / ${fmtShort(season.start).toUpperCase()} - ${fmtShort(season.end).toUpperCase()}`;

  const open = (a: string) => {
    const fixture = CONFIG.SHOW_SAMPLE_BUTTONS && a === CONFIG.SAMPLE_ACTIVE_ADDRESS ? '?fixture=full' : '';
    router.push(`/${season.id}/${a}${fixture}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = addr.trim().toLowerCase();
    if (!a) return setErr(c.errEmpty);
    if (!ADDRESS_RE.test(a)) return setErr(c.errInvalid);
    open(a);
  };

  // Adena injects window.adena. TODO: verify against a real Adena install (not testable headless).
  const connect = async () => {
    const adena = (window as unknown as { adena?: AdenaProvider }).adena;
    if (!adena) return setErr(c.errNoAdena);
    try {
      await adena.AddEstablish('Gno Wrapped');
      const a = (await adena.GetAccount())?.data?.address?.toLowerCase();
      if (a && ADDRESS_RE.test(a)) open(a);
      else setErr(c.errAdenaRead);
    } catch {
      setErr(c.errAdenaCancel);
    }
  };

  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav />
      <main className="gw-main gw-intro">
        <div style={{ animation: RISE(0), display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Pill>{seasonPill}</Pill>
          <SeasonCountdown season={season} final={final} />
        </div>
        <LiveTicker onFinal={setFinal} />
        <div className="gw-intro-mark" style={{ animation: RISE(80) }}>
          <div className="gw-wide-only"><Wordmark p={9} twoLines /></div>
          <div className="gw-narrow-only"><Wordmark p={6} twoLines /></div>
        </div>
        <h1 className="gw-h1" style={{ animation: RISE(160) }}>{c.introTitle(season)}</h1>
        <p className="gw-lede" style={{ animation: RISE(200) }}>{c.introLede}</p>
        <div className="gw-intro-form" style={{ animation: RISE(240) }}>
          <button type="button" className="gw-btn gw-btn-primary gw-btn-lg" onClick={connect}>
            <AdenaIcon size={24} />
            {c.connectAdena}
          </button>
          <div className="gw-divider">{c.orPaste}</div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="gw-addr" style={{ fontSize: 13, fontWeight: 500, color: '#A3AED6' }}>{c.walletAddress}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="gw-addr" className="gw-input" value={addr} onChange={(e) => { setAddr(e.target.value); setErr(''); }} placeholder="g1…" autoComplete="off" spellCheck={false} aria-invalid={!!err} style={{ borderColor: err ? '#FFB27A' : undefined }} />
              <button type="submit" className="gw-btn gw-btn-light gw-btn-lg">{c.unwrap}</button>
            </div>
            {err && <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: '#FFB27A' }}>{err}</p>}
          </form>
          {CONFIG.SHOW_SAMPLE_BUTTONS && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 13, color: '#A3AED6' }}>
              <span>{c.trySample}</span>
              {[[c.sampleActive, CONFIG.SAMPLE_ACTIVE_ADDRESS], [c.sampleEmpty, CONFIG.SAMPLE_EMPTY_ADDRESS]].map(([label, a]) => (
                <button key={label} type="button" className="gw-btn gw-btn-ghost" onClick={() => { setAddr(a); setErr(''); }}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <p className="gw-why" style={{ marginTop: 28 }}>
          <Link href="/personas" className="gw-ext">{c.meetPersonas}</Link>
          <Link href="/season" className="gw-ext">{c.seeSeason}</Link>
        </p>
      </main>
      <Footer final={final} />
    </div>
  );
}
