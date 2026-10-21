'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { rocket } from '@/lib/art';
import { gnoscanAccount, shortAddress } from '@/lib/wrapped';
import { Pill, Pixel } from './pixel';
import { useCopy } from './useLocale';
import { Footer, Nav, Starfield } from './web';

/** Shown while the address's recap loads (route loading boundary). */
export function LoadingScreen() {
  const c = useCopy();
  return (
    <div className="gw-page">
      <Starfield />
      <Nav />
      <main className="gw-main gw-center">
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 44 }}>
          {['#3D8BFF', '#3D8BFF', '#3D8BFF', '#FF8A3D'].map((c, i) => (
            <div key={i} style={{ width: 16, height: 16, background: c, animation: `gwHop 1000ms steps(6) ${i * 130}ms infinite` }} />
          ))}
        </div>
        <p role="status" style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{c.loading}</p>
        <Suspense fallback={null}><LoadingAddress /></Suspense>
      </main>
      <Footer />
    </div>
  );
}

// Route params are request-time data, so they stream in behind their own boundary.
function LoadingAddress() {
  const { address } = useParams<{ address?: string }>();
  if (!address) return null;
  return <p className="gw-mono" style={{ margin: 0, fontSize: 14, color: '#A3AED6' }}>{shortAddress(address)}</p>;
}

/** No recap for the address (API 404), or txCount 0. After the season (`final`), it's no longer "yet". */
export function EmptyState({ address, dataAsOf, final, seasonLabel }: { address: string; dataAsOf: string | null; final?: boolean; seasonLabel: string }) {
  const router = useRouter();
  const c = useCopy();
  const label = c.seasonLabel(seasonLabel.replace(/^Season /, 's'));
  return (
    <div className="gw-page">
      <Starfield />
      <Nav short={shortAddress(address)} explorer={gnoscanAccount(address)} />
      <main className="gw-main gw-empty">
        <Pill>{seasonLabel.toUpperCase()} / {final ? c.noActivity : c.notYet}</Pill>
        <p className="gw-kicker">{c.emptyTx(label)}</p>
        <div className="gw-hero-num" style={{ fontSize: 168 }}>0</div>
        <h1 className="gw-h1">{c.emptyTitle}</h1>
        {final ? (
          <p className="gw-lede">{c.emptyFinal(label)}</p>
        ) : (
          <>
            <p className="gw-lede">{c.emptyLive}</p>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#A3AED6' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              {c.emptyLiveNote}
            </p>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
          <button type="button" className="gw-btn gw-btn-lg" onClick={() => router.push('/')}>{c.tryAnother}</button>
          <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span className="gw-pixel-label" style={{ color: '#FF8A3D', animation: 'gwBlink 1200ms steps(1) infinite' }}>READY</span>
            <Pixel art={rocket} />
          </div>
        </div>
      </main>
      <Footer dataAsOf={dataAsOf} final={final} />
    </div>
  );
}
