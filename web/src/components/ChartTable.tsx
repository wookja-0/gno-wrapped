'use client';

import { useCopy } from './useLocale';

export type View = 'chart' | 'table';

/** Chart / Table switch for a chart box. The table takes the chart's place at the chart's size. */
export function ViewSwitch({ view, onChange, label }: { view: View; onChange: (v: View) => void; label: string }) {
  const c = useCopy();
  return (
    <div className="gw-view-switch" role="group" aria-label={c.viewOf(label)}>
      {(['chart', 'table'] as const).map((v) => (
        <button key={v} type="button" aria-pressed={view === v} onClick={() => onChange(v)}>
          {v === 'chart' ? c.chart : c.table}
        </button>
      ))}
    </div>
  );
}

/** Two-column table that scrolls inside its box, header pinned; numbers right-aligned. */
export function DataTable({ label, head, rows, empty }: { label: string; head: [string, string]; rows: [string, string][]; empty: string }) {
  const c = useCopy();
  return (
    <div className="gw-table-wrap" tabIndex={0} role="region" aria-label={c.asTable(label)}>
      {rows.length ? (
        <table className="gw-table">
          <thead><tr><th scope="col">{head[0]}</th><th scope="col">{head[1]}</th></tr></thead>
          <tbody>
            {rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}
          </tbody>
        </table>
      ) : (
        <p className="gw-table-empty">{empty}</p>
      )}
    </div>
  );
}
