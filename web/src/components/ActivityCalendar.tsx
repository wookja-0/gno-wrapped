'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  CAL_COLORS, calendarDays, calendarMonths, calendarWeeks, dayText, fmt, fmtShort, plural, weekRange, weekText, type WrappedData,
} from '@/lib/wrapped';
import { DataTable, ViewSwitch, type View } from './ChartTable';
import { DayList } from './DayList';

/**
 * Activity calendar. Owner view: a day-by-day grid (one column per season week, seven days down).
 * Share view: one cell per week by active days — the batch never sends a shared recap the daily
 * series. Hover, or focus the grid and use the arrow keys, to read a cell; Table swaps the grid for
 * the same values as a table, in the same box. On the owner's grid, clicking a day with transactions
 * (or Enter on it) lists them below, linked to Gnoscan.
 */
export function ActivityCalendar({ data }: { data: WrappedData }) {
  const cal = data.calendar!;
  const daily = !!cal.daily;
  const cells = daily ? calendarDays(data) : calendarWeeks(data);
  const months = daily ? calendarMonths(data) : [];
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<View>('chart');
  const [open, setOpen] = useState<number | null>(null); // the day whose transactions are listed
  const readout = useId();
  const label = daily ? 'Transactions per day' : 'Active days per week';

  const text = (i: number) => (daily ? dayText(cells[i]) : weekText(cells[i], data.season.start, i));
  const lastPast = cells.findLastIndex((c) => !c.future);
  const canOpen = (i: number | null): i is number => i !== null && daily && !!data.address && !cells[i].future && cells[i].count > 0;
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
        <span className="gw-big-line">{plural(cal.activeDays, 'active day', 'active days')}</span>
      </div>
      <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>
        Longest streak: {fmt(cal.longestStreak)} {plural(cal.longestStreak, 'day', 'days')} in a row
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
                {cells.map((c, i) => (
                  <div
                    key={c.date}
                    data-i={i}
                    className={`gw-cal-cell ${c.future ? 'gw-cal-future' : ''} ${active === i ? 'gw-cal-active' : ''} ${canOpen(i) ? 'gw-cal-has' : ''} ${open === i ? 'gw-cal-open' : ''}`}
                    style={c.future ? undefined : { background: CAL_COLORS[c.level] }}
                  />
                ))}
              </div>
            </div>
            {!daily && (
              <div className="gw-axis gw-mono" style={{ fontSize: 11 }}>
                <span>{fmtShort(data.season.start)}</span><span>{fmtShort(data.season.end)}</span>
              </div>
            )}
          </div>
          {view === 'table' && (
            <DataTable
              label={label}
              head={daily ? ['Day', 'Transactions'] : ['Week of', 'Active days']}
              rows={cells.flatMap((c, i): [string, string][] => (daily ? (c.count > 0 ? [[fmtShort(c.date), fmt(c.count)]] : []) : c.future ? [] : [[weekRange(i, data.season.start), `${c.count} of 7`]]))}
              empty="No activity yet."
            />
          )}
        </div>
        <p id={readout} className="gw-cal-readout" aria-live="polite">
          {view === 'table'
            ? daily ? `${fmt(cal.activeDays)} ${plural(cal.activeDays, 'day', 'days')} with transactions` : `${fmt(cal.activeDays)} active ${plural(cal.activeDays, 'day', 'days')} in all`
            : active !== null ? text(active) : daily ? 'Hover, or use the arrow keys; click a day for its list' : 'Hover a week, or use the arrow keys'}
        </p>
        <div className="gw-chart-foot">
          <div className={`gw-cal-legend ${view === 'table' ? 'gw-viz-hidden' : ''}`} aria-hidden="true">
            <span>{daily ? 'Less' : '0 days'}</span>
            {CAL_COLORS.map((c) => <i key={c} style={{ background: c }} />)}
            <span>{daily ? 'More' : '7 days'}</span>
          </div>
          <ViewSwitch view={view} onChange={setView} label={label} />
        </div>
      </div>
      </div>
    </div>
    {open !== null && (
      <DayList key={cells[open].date} data={data} date={cells[open].date} count={cells[open].count} onClose={() => setOpen(null)} />
    )}
    </>
  );
}
