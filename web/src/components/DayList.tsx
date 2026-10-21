'use client';

import { useEffect, useState } from 'react';
import { gnoscanAccount, gnoscanRealm, gnoscanTx, type DayTx, type WrappedData } from '@/lib/wrapped';
import { useCopy } from './useLocale';
import { ExtLink, PathText } from './web';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ok'; txs: DayTx[] };

const PAGE = 20; // rows per page (5 pages at most); the day's list is fetched once and paged here

/**
 * A clicked calendar day: its first transactions (the batch keeps up to DAY_TX_CAP a day), PAGE at a
 * time, each linked to Gnoscan, and a link to the account for the rest. Owner view only.
 */
export function DayList({ data, date, count, onClose }: { data: WrappedData; date: string; count: number; onClose: () => void }) {
  const c = useCopy();
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
              return (
                <li key={t.hash}>
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
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} type="button" onClick={() => setPage(i)} aria-current={i === page ? 'page' : undefined} aria-label={c.page(i + 1)}>
                    {i + 1}
                  </button>
                ))}
                <button type="button" onClick={() => setPage(page + 1)} disabled={page === pages - 1} aria-label={c.nextPage}>›</button>
              </div>
            </nav>
          )}
          {count > shown && (
            <ExtLink href={gnoscanAccount(data.address)} className="gw-ext gw-day-rest">
              {c.moreThatDay(count - shown)}
            </ExtLink>
          )}
          <p className="gw-hint" style={{ marginTop: 10 }}>{c.timesUtc}</p>
        </>
      )}
    </section>
  );
}
