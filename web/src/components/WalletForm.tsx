'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { parseAddresses, WALLETS_MAX, walletsHref } from '@/lib/wrapped';
import { useCopy } from './useLocale';

/** Add an address (or several, comma-separated) to `current` and open the combined page. */
export function WalletForm({ season, current, label }: { season: string; current: string[]; label?: string }) {
  const c = useCopy();
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const added = parseAddresses(value);
    if (!added) return setErr(value.trim() ? c.errInvalid : c.errEmpty);
    const fresh = added.filter((a) => !current.includes(a));
    if (!fresh.length) return setErr(c.errWalletDup);
    if (current.length + fresh.length > WALLETS_MAX) return setErr(c.errWalletsMax(WALLETS_MAX));
    router.push(walletsHref(season, [...current, ...fresh]));
  };
  return (
    <form onSubmit={submit} className="gw-compare-form">
      <label htmlFor={id} className="gw-compare-label">{label ?? c.addWallet}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id={id} className="gw-input" value={value} placeholder="g1…" autoComplete="off" spellCheck={false}
          aria-invalid={!!err} onChange={(e) => { setValue(e.target.value); setErr(''); }} />
        <button type="submit" className="gw-btn gw-btn-light">{c.add}</button>
      </div>
      {err && <p role="alert" className="gw-compare-err">{err}</p>}
    </form>
  );
}
