'use client';

import { useEffect, useState } from 'react';
import {
  dayTxAction, fmt, fmtShort, gnoscanAccount, gnoscanRealm, gnoscanTx, plural, type DayTx, type WrappedData,
} from '@/lib/wrapped';
import { ExtLink, PathText } from './web';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ok'; txs: DayTx[] };

const PAGE = 20; // rows per page (5 pages at most); the day's list is fetched once and paged here

/**
 * A clicked calendar day: its first transactions (the batch keeps up to DAY_TX_CAP a day), PAGE at a
 * time, each linked to Gnoscan, and a link to the account for the rest. Owner view only.
 */
export function DayList({ data, date, count, onClose }: { data: WrappedData; date: string; count: number; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0); // a new day remounts this component (keyed by date), so it starts at 0

  useEffect(() => {
    const ctl = new AbortController();
    const fixture = new URLSearchParams(window.location.search).get('fixture');
    setState({ status: 'loading' }); // eslint-disable-line react-hooks/set-state-in-effect -- a new day starts loading
    fetch(`/api/day/${data.season.id}/${data.address}/${date}${fixture ? `?fixture=${encodeURIComponent(fixture)}` : ''}`, { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<DayTx[]>) : Promise.reject(new Error(String(r.status)))))
      .then((txs) => setState({ status: 'ok', txs }))
      .catch((e) => { if (!ctl.signal.aborted) { console.error('[Gno Wrapped] day list', e); setState({ status: 'error' }); } });
    return () => ctl.abort();
  }, [data.season.id, data.address, date, attempt]);

  const shown = state.status === 'ok' ? state.txs.length : 0;
  const pages = Math.max(1, Math.ceil(shown / PAGE));
  const rows = state.status === 'ok' ? state.txs.slice(page * PAGE, page * PAGE + PAGE) : [];
  return (
    <section className="gw-day" aria-label={`Transactions on ${fmtShort(date)}`}>
      <div className="gw-day-head">
        <h3 className="gw-day-title">
          {fmtShort(date)} <span>· {fmt(count)} {plural(count, 'transaction', 'transactions')}</span>
        </h3>
        <button type="button" className="gw-visit-close" onClick={onClose} aria-label="Close the day">×</button>
      </div>
      {state.status === 'loading' && <p className="gw-hint">Loading…</p>}
      {state.status === 'error' && (
        <p className="gw-hint">
          Couldn&apos;t load this day.{' '}
          <button type="button" className="gw-link-btn" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </p>
      )}
      {state.status === 'ok' && (
        <>
          <ol className="gw-day-list" start={page * PAGE + 1} aria-label={`Transactions on ${fmtShort(date)}, in time order`}>
            {rows.map((t) => {
              const { action, path } = dayTxAction(t);
              return (
                <li key={t.hash}>
                  <span className="gw-mono gw-day-time">{t.time}</span>
                  <div className="gw-day-what">
                    <span className="gw-day-action">{action}</span>
                    {path && (
                      <span className="gw-day-path">
                        <PathText path={path} max={44} narrowMax={22} className="gw-path-row" />
                        <ExtLink href={gnoscanRealm(path)} className="gw-ext gw-ext-icon" label={`Open ${path} on Gnoscan`} />
                      </span>
                    )}
                    {t.msgs ? <span className="gw-day-more">+{t.msgs - 1} more {plural(t.msgs - 1, 'message', 'messages')}</span> : null}
                  </div>
                  <ExtLink href={gnoscanTx(t.hash)} className="gw-ext gw-day-tx" label={`Transaction at ${t.time} on Gnoscan`}>Gnoscan</ExtLink>
                </li>
              );
            })}
          </ol>
          {pages > 1 && (
            <nav className="gw-pager" aria-label="Pages">
              <span className="gw-pager-range" aria-live="polite">
                {fmt(page * PAGE + 1)}–{fmt(Math.min(shown, page * PAGE + PAGE))} of {fmt(shown)}
              </span>
              <div className="gw-pager-buttons">
                <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous page">‹</button>
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} type="button" onClick={() => setPage(i)} aria-current={i === page ? 'page' : undefined} aria-label={`Page ${i + 1}`}>
                    {i + 1}
                  </button>
                ))}
                <button type="button" onClick={() => setPage(page + 1)} disabled={page === pages - 1} aria-label="Next page">›</button>
              </div>
            </nav>
          )}
          {count > shown && (
            <ExtLink href={gnoscanAccount(data.address)} className="gw-ext gw-day-rest">
              +{fmt(count - shown)} more that day on Gnoscan
            </ExtLink>
          )}
          <p className="gw-hint" style={{ marginTop: 10 }}>Times are UTC.</p>
        </>
      )}
    </section>
  );
}
