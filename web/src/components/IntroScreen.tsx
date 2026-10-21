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
  const season = CONFIG.CURRENT_SEASON;
  const seasonPill = `MAINNET ${season.id.toUpperCase()} / ${fmtShort(season.start).toUpperCase()} - ${fmtShort(season.end).toUpperCase()}`;

  const open = (a: string) => {
    const fixture = CONFIG.SHOW_SAMPLE_BUTTONS && a === CONFIG.SAMPLE_ACTIVE_ADDRESS ? '?fixture=full' : '';
    router.push(`/${season.id}/${a}${fixture}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = addr.trim().toLowerCase();
    if (!a) return setErr('Paste a g1… address first.');
    if (!ADDRESS_RE.test(a)) return setErr("That doesn't look like a gno.land address. It starts with g1 and is 40 characters long.");
    open(a);
  };

  // Adena injects window.adena. TODO: verify against a real Adena install (not testable headless).
  const connect = async () => {
    const adena = (window as unknown as { adena?: AdenaProvider }).adena;
    if (!adena) return setErr('Adena wallet not found. Install it from adena.app, or paste your address below.');
    try {
      await adena.AddEstablish('Gno Wrapped');
      const a = (await adena.GetAccount())?.data?.address?.toLowerCase();
      if (a && ADDRESS_RE.test(a)) open(a);
      else setErr("Couldn't read an address from Adena. Paste it below instead.");
    } catch {
      setErr('Adena connection was cancelled. Try again, or paste your address below.');
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
        <h1 className="gw-h1" style={{ animation: RISE(160) }}>Your Mainnet Season {season.id.replace(/^s/i, '')} on gno.land</h1>
        <p className="gw-lede" style={{ animation: RISE(200) }}>Your first season on gno.land mainnet, unwrapped: when you arrived, the realms you called, your swaps, your gas and your persona.</p>
        <div className="gw-intro-form" style={{ animation: RISE(240) }}>
          <button type="button" className="gw-btn gw-btn-primary gw-btn-lg" onClick={connect}>
            <AdenaIcon size={24} />
            Connect Adena
          </button>
          <div className="gw-divider">or paste an address</div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="gw-addr" style={{ fontSize: 13, fontWeight: 500, color: '#A3AED6' }}>Wallet address</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="gw-addr" className="gw-input" value={addr} onChange={(e) => { setAddr(e.target.value); setErr(''); }} placeholder="g1…" autoComplete="off" spellCheck={false} aria-invalid={!!err} style={{ borderColor: err ? '#FFB27A' : undefined }} />
              <button type="submit" className="gw-btn gw-btn-light gw-btn-lg">Unwrap</button>
            </div>
            {err && <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: '#FFB27A' }}>{err}</p>}
          </form>
          {CONFIG.SHOW_SAMPLE_BUTTONS && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 13, color: '#A3AED6' }}>
              <span>Try a sample:</span>
              {[['Active wallet', CONFIG.SAMPLE_ACTIVE_ADDRESS], ['No activity', CONFIG.SAMPLE_EMPTY_ADDRESS]].map(([label, a]) => (
                <button key={label} type="button" className="gw-btn gw-btn-ghost" onClick={() => { setAddr(a); setErr(''); }}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <p className="gw-why" style={{ marginTop: 28 }}>
          <Link href="/personas" className="gw-ext">Meet the 8 season personas →</Link>
          <Link href="/season" className="gw-ext">See the whole season →</Link>
        </p>
      </main>
      <Footer final={final} />
    </div>
  );
}
