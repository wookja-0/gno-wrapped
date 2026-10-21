'use client';

import { useEffect, useState } from 'react';
import { DAY_PAGE as PAGE, gnoscanAccount, gnoscanRealm, gnoscanTx, pagerSlots, shortAddress, type DayTx } from '@/lib/wrapped';
import { useCopy } from './useLocale';
import { ExtLink, PathText } from './web';

type Row = DayTx & { wallet: number }; // index into `wallets`
type State = { status: 'loading' } | { status: 'error' } | { status: 'ok'; txs: Row[] };

// the day's list is fetched once and paged here, PAGE rows at a time

/**
 * A clicked calendar day: its first transactions (the batch keeps up to DAY_TX_CAP a day per
 * address), PAGE at a time, each linked to Gnoscan, and a link to the account for the rest. Owner
 * view only. With several wallets, each one's list is fetched and merged by time, and every row says
 * which wallet it came from.
 */
export function DayList({ season, date, count, wallets, onClose }: {
  season: string; date: string; count: number; wallets: { address: string; count: number }[]; onClose: () => void;
}) {
  const c = useCopy();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0); // a new day remounts this component (keyed by date), so it starts at 0
  const spec = JSON.stringify(wallets); // a stable effect dependency for a list rebuilt on every render

  useEffect(() => {
    const ctl = new AbortController();
    // dev/test: ?fixture=a,b gives the i-th wallet the i-th fixture, as on the wallets page
    const fixtures = new URLSearchParams(window.location.search).get('fixture')?.split(',');
    const list = JSON.parse(spec) as { address: string; count: number }[];
    setState({ status: 'loading' }); // eslint-disable-line react-hooks/set-state-in-effect -- a new day starts loading
    Promise.all(list.map(async (w, i): Promise<Row[]> => {
      if (!w.count) return [];
      const q = fixtures?.[i] ? `?fixture=${encodeURIComponent(fixtures[i])}` : '';
      const r = await fetch(`/api/day/${season}/${w.address}/${date}${q}`, { signal: ctl.signal });
      if (!r.ok) throw new Error(String(r.status));
      return ((await r.json()) as DayTx[]).map((t) => ({ ...t, wallet: i }));
    }))
      .then((lists) => {
        // each list is in chain order; several are merged by time (stable, so chain order within a minute)
        const txs = lists.flat();
        if (lists.filter((l) => l.length).length > 1) txs.sort((a, b) => a.time.localeCompare(b.time));
        setState({ status: 'ok', txs });
      })
      .catch((e) => { if (!ctl.signal.aborted) { console.error('[Gno Wrapped] day list', e); setState({ status: 'error' }); } });
    return () => ctl.abort();
  }, [season, spec, date, attempt]);

  const several = wallets.length > 1;
  const shown = state.status === 'ok' ? state.txs.length : 0;
  const pages = Math.max(1, Math.ceil(shown / PAGE));
  const rows = state.status === 'ok' ? state.txs.slice(page * PAGE, page * PAGE + PAGE) : [];
  // per wallet, what the batch didn't keep for this day
  const rest = state.status === 'ok' ? wallets.map((w, i) => w.count - state.txs.filter((t) => t.wallet === i).length) : [];
  return (
    <section className="gw-day" aria-label={c.dayRegion(date)}>
      <div className="gw-day-head">
        <h3 className="gw-day-title">
          {c.dayTitle(date, count)[0]} <span>{c.dayTitle(date, count)[1]}</span>
        </h3>
        <button type="button" className="gw-visit-close" onClick={onClose} aria-label={c.closeDay}>×</button>
      </div>
      {state.status === 'loading' && <p className="gw-hint">{c.loadingShort}</p>}
      {state.status === 'error' && (
        <p className="gw-hint">
          {c.dayLoadFailed}{' '}
          <button type="button" className="gw-link-btn" onClick={() => setAttempt((n) => n + 1)}>{c.tryAgain}</button>
        </p>
      )}
      {state.status === 'ok' && (
        <>
          <ol className="gw-day-list" start={page * PAGE + 1} aria-label={c.dayRegion(date)}>
            {rows.map((t) => {
              const { action, path } = c.dayTxAction(t);
              const from = shortAddress(wallets[t.wallet].address);
              return (
                <li key={`${t.wallet}:${t.hash}`}>
                  <span className="gw-mono gw-day-time">{t.time}</span>
                  <div className="gw-day-what">
                    <span className="gw-day-action">{action}</span>
                    {path && (
                      <span className="gw-day-path">
                        <PathText path={path} max={44} narrowMax={22} className="gw-path-row" />
                        <ExtLink href={gnoscanRealm(path)} className="gw-ext gw-ext-icon" label={c.openOnGnoscan(path)} />
                      </span>
                    )}
                    {t.msgs ? <span className="gw-day-more">{c.moreMessages(t.msgs - 1)}</span> : null}
                    {several && <span className="gw-mono gw-day-wallet" title={c.fromWallet(from)}>{from}</span>}
                  </div>
                  <ExtLink href={gnoscanTx(t.hash)} className="gw-ext gw-day-tx" label={c.txAt(t.time)}>{c.gnoscan}</ExtLink>
                </li>
              );
            })}
          </ol>
          {pages > 1 && (
            <nav className="gw-pager" aria-label={c.pages}>
              <span className="gw-pager-range" aria-live="polite">
                {c.range(page * PAGE + 1, Math.min(shown, page * PAGE + PAGE), shown)}
              </span>
              <div className="gw-pager-buttons">
                <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label={c.prevPage}>‹</button>
                {pagerSlots(pages, page).map((i, k) => (i === null ? <span key={`gap${k}`} className="gw-pager-gap" aria-hidden="true">…</span> : (
                  <button key={i} type="button" onClick={() => setPage(i)} aria-current={i === page ? 'page' : undefined} aria-label={c.page(i + 1)}>
                    {i + 1}
                  </button>
                )))}
                <button type="button" onClick={() => setPage(page + 1)} disabled={page === pages - 1} aria-label={c.nextPage}>›</button>
              </div>
            </nav>
          )}
          {wallets.map((w, i) => rest[i] > 0 && (
            <ExtLink key={w.address} href={gnoscanAccount(w.address)} className="gw-ext gw-day-rest">
              {several ? c.moreThatDayFrom(rest[i], shortAddress(w.address)) : c.moreThatDay(rest[i])}
            </ExtLink>
          ))}
          <p className="gw-hint" style={{ marginTop: 10 }}>{c.timesUtc}</p>
        </>
      )}
    </section>
  );
}
