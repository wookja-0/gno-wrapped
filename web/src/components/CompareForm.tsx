'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { parseShareId } from '@/lib/wrapped';
import { useCopy } from './useLocale';

/**
 * Paste a share link (or ID) to open /<season>/compare/<a>/<b>. `pair` puts the pasted ID on the
 * right side of the comparison: [this recap, theirs] from your own recap, [yours, this one] from
 * someone else's.
 */
export function CompareForm({ season, pair, label, placeholder = 'https://…/s1/s/…' }: {
  season: string; pair: (other: string) => [string, string]; label?: string; placeholder?: string;
}) {
  const c = useCopy();
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const other = parseShareId(value);
    if (!other) return setErr(c.compareErr);
    const [a, b] = pair(other);
    router.push(`/${season}/compare/${a}/${b}`);
  };
  return (
    <form onSubmit={submit} className="gw-compare-form">
      <label htmlFor={id} className="gw-compare-label">{label ?? c.theirLink}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id={id} className="gw-input" value={value} placeholder={placeholder} autoComplete="off" spellCheck={false}
          aria-invalid={!!err} onChange={(e) => { setValue(e.target.value); setErr(''); }} />
        <button type="submit" className="gw-btn gw-btn-light">{c.compare}</button>
      </div>
      {err && <p role="alert" className="gw-compare-err">{err}</p>}
    </form>
  );
}
