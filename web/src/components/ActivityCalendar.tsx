'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CAL_COLORS, calendarDays, calendarMonths, calendarWeeks, fmt, type DayWallet, type WrappedData } from '@/lib/wrapped';
import { DataTable, ViewSwitch, type View } from './ChartTable';
import { DayList } from './DayList';
import { useCopy } from './useLocale';

/**
 * Activity calendar. Owner view: a day-by-day grid (one column per season week, seven days down).
 * Share view: one cell per week by active days — the batch never sends a shared recap the daily
 * series. Hover, or focus the grid and use the arrow keys, to read a cell; Table swaps the grid for
 * the same values as a table, in the same box. On the owner's grid, clicking a day with transactions
 * (or Enter on it) lists them below, linked to Gnoscan. `wallets` (several wallets added up) lists
 * every wallet's transactions that day; by default it's the recap's own address.
 */
export function ActivityCalendar({ data, wallets }: { data: WrappedData; wallets?: DayWallet[] }) {
  const c = useCopy();
  const cal = data.calendar!;
  const daily = !!cal.daily;
  const owners = wallets ?? (data.address && cal.daily ? [{ address: data.address, daily: cal.daily }] : []);
  const cells = daily ? calendarDays(data) : calendarWeeks(data);
  const months = daily ? calendarMonths(data, c.month) : [];
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<View>('chart');
  const [open, setOpen] = useState<number | null>(null); // the day whose transactions are listed
  const readout = useId();
  const label = daily ? c.perDay : c.perWeek;

  const text = (i: number) => (daily ? c.dayText(cells[i]) : c.weekText(cells[i], data.season.start, i));
  const lastPast = cells.findLastIndex((x) => !x.future);
  const canOpen = (i: number | null): i is number => i !== null && daily && owners.length > 0 && !cells[i].future && cells[i].count > 0;
  const toggle = (i: number | null) => { if (canOpen(i)) setOpen((o) => (o === i ? null : i)); };
  const step = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(active ?? lastPast); return; } // like the arrows: from the last day
    if (e.key === 'Escape') { setOpen(null); return; }
    const by = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: daily ? -7 : -1, ArrowRight: daily ? 7 : 1 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    setActive((i) => Math.min(cells.length - 1, Math.max(0, (i ?? lastPast) + by)));
  };
  const hover = (e: PointerEvent) => {
    const i = (e.target as HTMLElement).dataset.i;
    if (i !== undefined) setActive(Number(i));
  };

  return (
    <>
    <div className={daily ? 'gw-cal-layout' : undefined}>
      <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14 }}>
        <span className="gw-hero-num">{fmt(cal.activeDays)}</span>
        <span className="gw-big-line">{c.activeDays(cal.activeDays)}</span>
      </div>
      <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>
        {c.streak(cal.longestStreak)}
      </p>
      </div>
      <div style={{ minWidth: 0 }}>

      <div className="gw-chart">
        <div className={view === 'table' ? 'gw-viz gw-viz-table' : 'gw-viz'}>
          <div className={view === 'table' ? 'gw-viz-hidden' : undefined} aria-hidden={view === 'table' || undefined}>
            <div
              className={daily ? 'gw-cal' : 'gw-cal gw-cal-weeks'}
              role="group"
              aria-label={label}
              aria-describedby={readout}
              tabIndex={view === 'chart' ? 0 : -1}
              onKeyDown={step}
              onFocus={() => setActive((i) => i ?? lastPast)}
              onBlur={() => setActive(null)}
              onPointerOver={hover}
              onPointerLeave={() => setActive(null)}
              onClick={(e) => { const i = (e.target as HTMLElement).dataset.i; if (i !== undefined) toggle(Number(i)); }}
            >
              {daily && (
                <div className="gw-cal-months" aria-hidden="true">
                  {months.map((m) => <span key={m.week} style={{ gridColumn: m.week + 1 }}>{m.label}</span>)}
                </div>
              )}
              <div className="gw-cal-cells">
                {cells.map((x, i) => (
                  <div
                    key={x.date}
                    data-i={i}
                    className={`gw-cal-cell ${x.future ? 'gw-cal-future' : ''} ${active === i ? 'gw-cal-active' : ''} ${canOpen(i) ? 'gw-cal-has' : ''} ${open === i ? 'gw-cal-open' : ''}`}
                    style={x.future ? undefined : { background: CAL_COLORS[x.level] }}
                  />
                ))}
              </div>
            </div>
            {!daily && (
              <div className="gw-axis gw-mono" style={{ fontSize: 11 }}>
                <span>{c.short_(data.season.start)}</span><span>{c.short_(data.season.end)}</span>
              </div>
            )}
          </div>
          {view === 'table' && (
            <DataTable
              label={label}
              head={daily ? [c.colDay, c.colTransactions] : [c.colWeek, c.colActiveDays]}
              rows={cells.flatMap((x, i): [string, string][] => (daily ? (x.count > 0 ? [[c.short_(x.date), fmt(x.count)]] : []) : x.future ? [] : [[c.week(i, data.season.start), c.ofSeven(x.count)]]))}
              empty={c.noActivityYet}
            />
          )}
        </div>
        <p id={readout} className="gw-cal-readout" aria-live="polite">
          {view === 'table'
            ? daily ? c.daysWithTx(cal.activeDays) : c.activeDaysInAll(cal.activeDays)
            : active !== null ? text(active) : daily ? c.hintDay : c.hintWeek}
        </p>
        <div className="gw-chart-foot">
          <div className={`gw-cal-legend ${view === 'table' ? 'gw-viz-hidden' : ''}`} aria-hidden="true">
            <span>{daily ? c.less : c.zeroDays}</span>
            {CAL_COLORS.map((x) => <i key={x} style={{ background: x }} />)}
            <span>{daily ? c.more : c.sevenDays}</span>
          </div>
          <ViewSwitch view={view} onChange={setView} label={label} />
        </div>
      </div>
      </div>
    </div>
    {open !== null && (
      <DayList
        key={cells[open].date}
        season={data.season.id}
        date={cells[open].date}
        count={cells[open].count}
        wallets={owners.map((w) => ({ address: w.address, count: w.daily[open] ?? 0 }))}
        onClose={() => setOpen(null)}
      />
    )}
    </>
  );
}
