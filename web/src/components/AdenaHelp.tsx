'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CONFIG } from '@/lib/config';
import type { WalletEnv } from '@/lib/wrapped';
import { AdenaIcon } from './AdenaIcon';
import { useCopy } from './useLocale';

export type AdenaHelpKind = 'unsupported' | 'install' | 'no-account';

/**
 * What "Connect Adena" can't do by itself, as a modal: open this page where Adena runs, install
 * Adena (a page can't see an extension installed after it loaded, hence Reload), or create a wallet
 * in Adena (a page can't open an extension's own screens). Pasting an address is always offered.
 */
export function AdenaHelp({ kind, env, onClose, onPaste, onRetry }: {
  kind: AdenaHelpKind; env: WalletEnv; onClose: () => void; onPaste: () => void; onRetry: () => void;
}) {
  const c = useCopy();
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [copied, setCopied] = useState<'' | 'ok' | 'failed'>('');
  useEffect(() => { ref.current?.showModal(); }, []);

  // close first, so focus goes back to Connect Adena, then act. (Try again doesn't close: the
  // close event comes a task later and would dismiss a dialog the retry opened.)
  const then = (act?: () => void) => () => { ref.current?.close(); act?.(); };
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => setCopied('ok'), () => setCopied('failed'));
  };
  const store = env === 'firefox' ? 'firefox' : 'chromium';
  const text = {
    unsupported: [c.adenaUnsupportedTitle, c.adenaUnsupportedBody],
    install: [c.adenaInstallTitle, c.adenaInstallBody(c.adenaStore[store])],
    'no-account': [c.adenaNoAccountTitle, c.adenaNoAccountBody],
  }[kind];

  return (
    <dialog ref={ref} className="gw-dialog" aria-labelledby={title} onClose={onClose}>
      <div className="gw-dialog-icon"><AdenaIcon size={30} /></div>
      <h2 id={title}>{text[0]}</h2>
      <p>{text[1]}</p>

      {kind === 'no-account' && (
        <ol className="gw-dialog-steps" aria-label={c.adenaSteps}>
          {c.adenaNoAccountSteps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
      {kind === 'unsupported' && copied === 'failed' && <p className="gw-mono gw-dialog-link">{window.location.href}</p>}

      <div className="gw-dialog-actions">
        {kind === 'unsupported' && (
          <button type="button" className="gw-btn gw-btn-primary" onClick={copyLink}>{copied === 'ok' ? c.linkCopied : c.copyPageLink}</button>
        )}
        {kind === 'install' && (
          <>
            {/* numbered: the reload only helps after the install */}
            <a className="gw-btn gw-btn-primary" href={CONFIG.ADENA_STORE[store]} target="_blank" rel="noopener noreferrer">
              <span className="gw-dialog-num" aria-hidden="true">1</span>{c.installAdena}
            </a>
            <button type="button" className="gw-btn" onClick={() => window.location.reload()}>
              <span className="gw-dialog-num" aria-hidden="true">2</span>{c.reloadPage}
            </button>
          </>
        )}
        {kind === 'no-account' && <button type="button" className="gw-btn gw-btn-primary" onClick={onRetry}>{c.tryAgain}</button>}
      </div>

      <div className="gw-dialog-or" aria-hidden="true">{c.or}</div>
      <button type="button" className="gw-link-btn gw-dialog-paste" onClick={then(onPaste)}>{c.pasteAddress}</button>

      <button type="button" className="gw-visit-close gw-dialog-close" onClick={then()} aria-label={c.dismiss}>×</button>
    </dialog>
  );
}
