'use client';

import { useEffect, useState } from 'react';
import { visitDiff, visitSnapshot, type VisitSnapshot, type WrappedData } from '@/lib/wrapped';
import { useCopy } from './useLocale';

const key = (d: WrappedData) => `gw:visit:${d.season.id}:${d.address}`;
interface Visit { at: string; snap: VisitSnapshot }

function read(raw: string | null): Visit | null {
  try {
    const v = raw ? (JSON.parse(raw) as Visit) : null;
    return v && v.snap && typeof v.snap.txCount === 'number' ? v : null;
  } catch {
    return null;
  }
}

/**
 * "Since your last visit": what changed since this browser last opened the address's recap. The
 * snapshot lives in localStorage only (nothing is sent anywhere). The comparison point is fixed for
 * the tab's session (sessionStorage), so a reload keeps showing the same changes; each visit then
 * becomes the next one's comparison point.
 */
export function SinceLastVisit({ data }: { data: WrappedData }) {
  const c = useCopy();
  const [prev, setPrev] = useState<Visit | null>(null); // the visit compared against, once it has changes to show

  useEffect(() => {
    if (!data.season?.id) return; // a recap without a season shows the DATA ERROR banner instead
    const k = key(data);
    try {
      let base = sessionStorage.getItem(k);
      if (base === null) {
        base = localStorage.getItem(k) ?? '';
        sessionStorage.setItem(k, base);
      }
      localStorage.setItem(k, JSON.stringify({ at: new Date().toISOString(), snap: visitSnapshot(data) } satisfies Visit));
      const prev = read(base);
      const lines = prev ? visitDiff(prev.snap, data) : [];
      if (sessionStorage.getItem(k + ':dismissed') || !prev || !lines.length) return;
      setPrev(prev); // eslint-disable-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
    } catch {
      // storage disabled (private mode, blocked cookies): no comparison, nothing to show
    }
  }, [data]);

  if (!prev) return null;
  const lines = c.visitDiff(prev.snap, data);
  const dismiss = () => {
    sessionStorage.setItem(key(data) + ':dismissed', '1');
    setPrev(null);
  };
  return (
    <section className="gw-visit" aria-label={c.sinceVisitRegion}>
      <div className="gw-visit-head">
        <h2 className="gw-h3">{c.sinceVisit(c.visitDate(prev.at))}</h2>
        <button type="button" className="gw-visit-close" onClick={dismiss} aria-label={c.dismiss}>×</button>
      </div>
      <ul>
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </section>
  );
}
