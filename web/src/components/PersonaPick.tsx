'use client';

import Link from 'next/link';
import { PERSONA_IDS, personaColors, pix } from '@/lib/art';
import { PERSONA_TITLES } from '@/lib/wrapped';
import { PersonaBadge, Pixel } from './pixel';
import { Tilt } from './Tilt';
import { useCopy } from './useLocale';

// A pixel arrow toward the address field: left beside the form, turned up when the grid sits under it.
const ARROW = pix(['...A...', '..AA...', '.AAAAAA', 'AAAAAAA', '.AAAAAA', '..AA...', '...A...'], { A: '#FFD166' }, 3);

/**
 * The intro's "Which one are you?": the nine persona badges in a 3x3 grid, each tilting with its
 * foil under a mouse and linking to its rule on /personas, then a button back to the address field.
 * No touch tilt here: on a phone a tap should just follow the link.
 */
export function PersonaPick() {
  const c = useCopy();
  return (
    <section className="gw-pick" aria-labelledby="gw-pick-title">
      <h2 id="gw-pick-title" className="gw-h3">{c.introPick}</h2>
      <p className="gw-pick-lede">{c.introPickLede}</p>
      <ul className="gw-pick-grid">
        {PERSONA_IDS.map((id) => {
          const col = personaColors(id);
          const title = c.personaTitle(id, PERSONA_TITLES[id] ?? id);
          return (
            <li key={id}>
              <Link href={`/personas#${id}`} className="gw-pick-tile" style={{ ['--pd' as string]: col.deep, ['--pe' as string]: col.edge, ['--ph' as string]: col.hi }} aria-label={c.introPickTile(title)}>
                <Tilt shape="badge" max={18}>
                  <PersonaBadge id={id} p={3} label={c.badge(title)} foil />
                </Tilt>
                <span>{title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" className="gw-pick-cta" onClick={() => { const el = document.getElementById('gw-addr'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }); }}>
        <span className="gw-pick-arrow"><Pixel art={ARROW} /></span>
        {c.introPickCta}
      </button>
    </section>
  );
}
