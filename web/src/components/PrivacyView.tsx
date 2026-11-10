'use client';

import { CONFIG } from '@/lib/config';
import { Pill } from './pixel';
import { useCopy } from './useLocale';
import { useHydrated } from './useReducedMotion';
import { ExtLink, Footer, Nav, Reveal, Starfield } from './web';

/**
 * /privacy: what the site collects and doesn't, in plain words. Keep it in step with the code: no
 * cookies or third-party requests (web/), what share links leave out (batch/share.go), the Adena
 * calls (IntroScreen), localStorage (useLocale, SinceLastVisit) and the api's access log.
 */
export function PrivacyView() {
  const c = useCopy();
  const hydrated = useHydrated();
  const p = c.privacy;
  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav />
      <main className="gw-main gw-personas gw-privacy">
        <Reveal><Pill>{p.pill}</Pill></Reveal>
        <Reveal delay={80}><h1 className="gw-h1">{p.title}</h1></Reveal>
        <Reveal delay={160}><p className="gw-lede">{p.lede}</p></Reveal>

        <div className="gw-privacy-list">
          {p.sections.map(([title, body], i) => (
            <Reveal as="section" key={title} className="gw-privacy-item" label={title} delay={(i % 2) * 80}>
              <h2>{title}</h2>
              <p>{body}</p>
              {i === p.sections.length - 1 && (
                <div className="gw-privacy-links">
                  <ExtLink href={CONFIG.REPO_URL}>{p.viewSource}</ExtLink>
                  <ExtLink href={`${CONFIG.REPO_URL}/issues`}>{p.openIssue}</ExtLink>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
