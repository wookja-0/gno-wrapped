'use client';

import { useEffect, useRef, useState } from 'react';
import { fmt, gnoscanBlock } from '@/lib/wrapped';
import { ExtLink } from './web';

interface Live { addresses: number; transactions: number; height: number }

/** "LIVE · 5,029 addresses · 176,031 transactions · block #915,947", refreshed every 5s. Hidden until the first read. */
export function LiveTicker() {
  const [live, setLive] = useState<Live | null>(null);
  const [bump, setBump] = useState(0); // re-keys the block number so it fades in on each new block
  const lastHeight = useRef<number | null>(null);
  useEffect(() => {
    let stop = false;
    const read = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const next = (await res.json()) as Live;
        if (stop) return;
        if (lastHeight.current !== null && lastHeight.current !== next.height) setBump((b) => b + 1);
        lastHeight.current = next.height;
        setLive(next);
      } catch {
        // keep the last numbers
      }
    };
    read();
    const iv = setInterval(read, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, []);
  if (!live) return null;
  return (
    <p className="gw-live" role="status" aria-live="off" aria-label="Live season stats">
      <span className="gw-live-dot" aria-hidden="true" />
      <span className="gw-pixel-label" style={{ color: '#5BD15B' }}>LIVE</span>
      <span>{fmt(live.addresses)} addresses</span>
      <span>{fmt(live.transactions)} transactions</span>
      <ExtLink key={bump} href={gnoscanBlock(live.height)} className="gw-ext gw-live-block gw-mono" label={`Block ${fmt(live.height)} on Gnoscan`}>block #{fmt(live.height)}</ExtLink>
    </p>
  );
}
