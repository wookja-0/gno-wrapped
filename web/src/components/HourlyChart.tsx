'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { chronotype, fmt, hourLabel, localHours, peakIndex, tzLabel, tzShift, type WrappedData } from '@/lib/wrapped';
import { DataTable, ViewSwitch, type View } from './ChartTable';
import { useCopy } from './useLocale';
import { useTzOffset } from './useReducedMotion';
import { Pill } from './pixel';
import { Card } from './web';

/** The recap's hours in the viewer's time zone (the batch counts by UTC hour): the counts, peak and chronotype. */
export function useClock(d: WrappedData) {
  const offset = useTzOffset();
  const hours = localHours(d.hours ?? [], tzShift(offset));
  return { hours, peak: peakIndex(hours), type: chronotype(hours), tz: tzLabel(offset), rounded: offset % 60 !== 0 };
}

/** The Clock card: chronotype, busiest hour and the hourly chart; nothing with too few transactions. */
export function ClockCard({ data }: { data: WrappedData }) {
  const c = useCopy();
  const clock = useClock(data);
  if (!clock.type) return null;
  const [busyPre, busyHour] = c.busiestHour(Math.max(0, clock.peak));
  return (
    <Card label="Clock" className="gw-span-12">
      <Pill>CLOCK</Pill>
      <p className="gw-kicker">{c.clockKicker}</p>
      <div className="gw-clock">
        <div>
          <h3 className="gw-clock-type">{c.chronotype(clock.type.id)}</h3>
          <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>{c.chronotypeLine(clock.type)}</p>
          <p className="gw-body-strong">{busyPre}<span style={{ color: '#FF8A3D' }}>{busyHour}</span></p>
          <p className="gw-hint">{c.clockTz(clock.tz, clock.rounded)}</p>
        </div>
        <HourlyChart hours={clock.hours} peak={clock.peak} />
      </div>
    </Card>
  );
}

/**
 * Transactions per hour of the day as 24 columns, the busiest hour in orange, like DailyChart: hover,
 * or focus the chart and use the arrow keys, to read an hour; Table lists every hour with a value.
 */
export function HourlyChart({ hours, peak }: { hours: number[]; peak: number }) {
  const c = useCopy();
  const max = Math.max(1, ...hours);
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<View>('chart');
  const readout = useId();

  const step = (e: KeyboardEvent) => {
    const by = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    setActive((i) => Math.min(23, Math.max(0, (i ?? Math.max(0, peak)) + by)));
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
            className="gw-daily gw-hourly"
            role="group"
            aria-label={c.perHour}
            aria-describedby={readout}
            tabIndex={view === 'chart' ? 0 : -1}
            onKeyDown={step}
            onFocus={() => setActive((i) => i ?? Math.max(0, peak))}
            onBlur={() => setActive(null)}
            onPointerOver={hover}
            onPointerLeave={() => setActive(null)}
          >
            {hours.map((n, h) => (
              <div key={h} data-i={h} className={`gw-daily-slot ${active === h ? 'gw-daily-active' : ''}`}>
                {n > 0 && <div className="gw-daily-bar" style={{ height: `${Math.max(2, (n / max) * 100)}%`, background: h === peak ? '#FF8A3D' : '#3D8BFF' }} />}
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: '#2A3566' }} />
          <div className="gw-axis gw-mono" style={{ fontSize: 11 }}>
            {[0, 6, 12, 18, 24].map((h) => <span key={h}>{hourLabel(h)}</span>)}
          </div>
        </div>
        {view === 'table' && (
          <DataTable
            label={c.perHour}
            head={[c.colHour, c.colTransactions]}
            rows={hours.flatMap((n, h) => (n > 0 ? [[hourLabel(h), fmt(n)] as [string, string]] : []))}
            empty={c.nothingYet}
          />
        )}
      </div>
      <p id={readout} className="gw-cal-readout" aria-live="polite">
        {view === 'table' ? c.inAll(hours.reduce((a, b) => a + b, 0), c.unitTx[1]) : active !== null ? c.hourText(active, hours[active]) : c.hintHour}
      </p>
      <div className="gw-chart-foot">
        <span />
        <ViewSwitch view={view} onChange={setView} label={c.perHour} />
      </div>
    </div>
  );
}
