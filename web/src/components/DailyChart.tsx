'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { daySeries, fmt, fmtShort, peakIndex, plural, type Season } from '@/lib/wrapped';
import { DataTable, ViewSwitch, type View } from './ChartTable';

/**
 * One daily series as a column chart: a slot per season day (days that haven't happened keep their
 * slot, empty), the peak day in orange. Each slot is its full column's hit target. Hover, or focus
 * the chart and use the arrow keys, to read a day; Table swaps the chart for every day with a value.
 */
export function DailyChart({ label, values, season, dataAsOf, unit }: {
  label: string; values: number[]; season: Season; dataAsOf: string; unit: [string, string];
}) {
  const days = daySeries(values, season, dataAsOf);
  const peak = peakIndex(values);
  const max = Math.max(1, ...values);
  const [active, setActive] = useState<number | null>(null);
  const readout = useId();
  const [view, setView] = useState<View>('chart');
  const lastPast = days.findLastIndex((d) => !d.future);
  const text = (i: number) =>
    days[i].future ? `${fmtShort(days[i].date)} hasn't happened yet` : `${fmt(days[i].value)} ${plural(days[i].value, unit[0], unit[1])} on ${fmtShort(days[i].date)}`;

  const step = (e: KeyboardEvent) => {
    const by = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    setActive((i) => Math.min(lastPast, Math.max(0, (i ?? lastPast) + by)));
  };
  const hover = (e: PointerEvent) => {
    const i = (e.target as HTMLElement).closest<HTMLElement>('[data-i]')?.dataset.i;
    if (i !== undefined) setActive(Number(i));
  };

  return (
    <div className="gw-chart">
      <div className={view === 'table' ? 'gw-viz gw-viz-table' : 'gw-viz'}>
        <div className={view === 'table' ? 'gw-viz-hidden' : undefined} aria-hidden={view === 'table' || undefined}>
          <div className="gw-daily-cap gw-mono" aria-hidden="true">{fmt(max)}</div>
          <div
            className="gw-daily"
            role="group"
            aria-label={label}
            aria-describedby={readout}
            tabIndex={view === 'chart' ? 0 : -1}
            onKeyDown={step}
            onFocus={() => setActive((i) => i ?? lastPast)}
            onBlur={() => setActive(null)}
            onPointerOver={hover}
            onPointerLeave={() => setActive(null)}
          >
            {days.map((d, i) => (
              <div key={d.date} data-i={i} className={`gw-daily-slot ${active === i ? 'gw-daily-active' : ''}`}>
                {!d.future && d.value > 0 && (
                  <div className="gw-daily-bar" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: i === peak ? '#FF8A3D' : '#3D8BFF' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: '#2A3566' }} />
          <div className="gw-axis gw-mono" style={{ fontSize: 11 }}>
            <span>{fmtShort(season.start)}</span><span>{fmtShort(season.end)}</span>
          </div>
        </div>
        {view === 'table' && (
          <DataTable
            label={label}
            head={['Day', unit[1][0].toUpperCase() + unit[1].slice(1)]}
            rows={days.flatMap((d) => (!d.future && d.value > 0 ? [[fmtShort(d.date), fmt(d.value)] as [string, string]] : []))}
            empty="Nothing yet."
          />
        )}
      </div>
      <p id={readout} className="gw-cal-readout" aria-live="polite">
        {view === 'table' ? `${fmt(values.reduce((a, b) => a + b, 0))} ${unit[1]} in all` : active !== null ? text(active) : peak >= 0 ? `Peak: ${text(peak)}` : 'Nothing yet.'}
      </p>
      <div className="gw-chart-foot">
        <span />
        <ViewSwitch view={view} onChange={setView} label={label} />
      </div>
    </div>
  );
}
