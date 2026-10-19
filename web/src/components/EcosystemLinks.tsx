import { useId, type ReactNode } from 'react';
import { CONFIG } from '@/lib/config';
import { AdenaIcon } from './AdenaIcon';

/*
 * Official marks, each drawn twice: a one-color version in currentColor (shown by default) and the
 * original colors (shown on hover/focus, see .gw-eco in globals.css).
 * - gno.land: gnolang/gno gno.land/pkg/gnoweb/public/imgs/gnoland.svg
 * - Gnoscan: onbloc/gnoscan public/favicon.svg
 * - GnoSwap: gnoswap-labs/gnoswap-interface packages/web/public/favicon.svg
 * - Adena: AdenaIcon (onbloc/adena-wallet)
 */

const GNO_HAT = 'M24.1944 17.4535C23.9204 15.2083 23.0928 12.9603 22.0882 10.935C21.1893 9.12255 21.4167 6.906 22.8612 5.48951V5.48951C23.4216 4.93994 23.0246 4 22.2318 4H16.9011C16.4897 4 16.0772 4.17774 15.7992 4.53212C13.9222 6.92776 10.2472 12.1988 9.60562 17.4535C9.5478 17.9322 10.1205 18.2255 10.4874 17.905C11.7684 16.7862 13.7665 15.9858 16.9 15.9858C20.0335 15.9858 22.0306 16.7873 23.3126 17.905C23.6796 18.2255 24.2522 17.9311 24.1944 17.4535Z';
const GNO_BEARD = 'M24.3981 21.4357C24.3981 21.4353 24.3981 21.435 24.398 21.4346C24.2011 20.7261 23.7808 20.1025 23.2105 19.6262C22.9904 19.4419 22.7502 19.2674 22.4878 19.1049C22.2654 18.9665 21.9852 19.1704 22.0497 19.4212L22.2076 20.034C22.4077 20.8125 21.556 21.4439 20.8465 21.0437L18.9395 19.9685C17.6864 19.262 16.1452 19.262 14.892 19.9685L12.985 21.0437C12.2756 21.4439 11.4239 20.8114 11.624 20.034L11.7864 19.4037C11.8509 19.154 11.5718 18.9501 11.3494 19.0875C11.058 19.2663 10.7934 19.4604 10.5532 19.6643C9.99168 20.1419 9.60138 20.7831 9.41902 21.4897L9.41235 21.5158C8.94867 23.3216 9.66921 25.22 11.2237 26.2897L16.0385 29.6013C16.5655 29.9633 17.2672 29.9633 17.7942 29.6013L22.609 26.2897C24.1867 25.2048 24.905 23.2652 24.3982 21.4368C24.3982 21.4364 24.3981 21.4361 24.3981 21.4357V21.4357Z';

const SCAN_HAT = 'M29.9955 23.2905C29.5348 19.1209 27.6469 14.9433 25.821 11.7427L28.5342 8.80361C29.1485 8.13815 28.7133 7 27.8443 7H22.0012C21.5503 7 21.0981 7.21522 20.7934 7.64433C18.736 10.5452 14.7077 16.9278 14.0045 23.2905C13.9411 23.8702 14.5688 24.2254 14.971 23.8372C16.3751 22.4825 18.5653 21.5133 22 21.5133C25.4347 21.5133 27.6237 22.4838 29.029 23.8372C29.4312 24.2254 30.0589 23.8689 29.9955 23.2905Z';
const SCAN_BEARD = 'M30.8107 27.6505C30.5789 26.8651 30.084 26.174 29.4122 25.6459C29.153 25.4417 28.8701 25.2484 28.5611 25.0684C28.2992 24.9149 27.9692 25.1409 28.0452 25.4188L28.2311 26.0978C28.4668 26.9605 27.4638 27.6601 26.6284 27.2167L24.3827 26.0253C22.907 25.2424 21.0921 25.2424 19.6164 26.0253L17.3708 27.2167C16.5354 27.6601 15.5323 26.9593 15.768 26.0978L15.9592 25.3995C16.0352 25.1228 15.7065 24.8968 15.4446 25.0491C15.1015 25.2472 14.7899 25.4623 14.5071 25.6882C13.8458 26.2175 13.3862 26.9279 13.1714 27.7109L13.1636 27.7399C12.6176 29.7407 13.4661 31.8443 15.2966 33.0296L20.9664 36.6991C21.5871 37.1003 22.4134 37.1003 23.034 36.6991L28.7038 33.0296C30.5619 31.8274 31.4078 29.6779 30.8107 27.6517V27.6505Z';

const SWAP = [
  ['M3.50879 2.27311L6.99707 0L13.9995 4.52712L10.5165 6.79829L3.50879 2.27311Z', 1],
  ['M3.58105 7.88639L7.06933 5.61328L13.9995 10.0715L10.5808 12.3832L3.58105 7.88639Z', 0.4],
  ['M0.0107422 11.1442L3.5094 8.87109L10.4963 13.4068L6.99768 15.6589L0.0107422 11.1442Z', 0.6],
  ['M0 4.52569L3.50858 2.26562V8.87061L0 11.1482V4.52569Z', 1],
  ['M10.5812 12.382L14.0001 10.0703V11.1301L10.5088 13.399L10.5812 12.382Z', 0.5],
] as const;

const S = 18;

function GnolandMark({ color }: { color: boolean }) {
  return (
    <svg width={S} height={S} viewBox="2.9 2.8 28 28" fill="none" aria-hidden="true">
      <path d={GNO_BEARD} fill={color ? '#999999' : 'currentColor'} fillOpacity={color ? 1 : 0.6} />
      <path d={GNO_HAT} fill={color ? '#226C57' : 'currentColor'} />
    </svg>
  );
}

function GnoscanMark({ color }: { color: boolean }) {
  const mask = useId();
  if (color) {
    return (
      <svg width={S} height={S} viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="22" fill="black" />
        <path d={SCAN_BEARD} fill="#808080" />
        <path d={SCAN_HAT} fill="white" />
      </svg>
    );
  }
  return (
    <svg width={S} height={S} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <mask id={mask}>
        <rect width="44" height="44" fill="white" />
        <path d={SCAN_BEARD} fill="black" fillOpacity={0.6} />
        <path d={SCAN_HAT} fill="black" />
      </mask>
      <circle cx="22" cy="22" r="22" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}

function GnoswapMark({ color }: { color: boolean }) {
  return (
    <svg width={S} height={S} viewBox="-1 0 16 16" fill="none" aria-hidden="true">
      {SWAP.map(([d, o]) => <path key={d} d={d} fill={color ? '#233DBD' : 'currentColor'} fillOpacity={o} />)}
    </svg>
  );
}

function AdenaMark({ color }: { color: boolean }) {
  const mask = useId();
  if (color) return <AdenaIcon size={S} />;
  return (
    <svg width={S} height={S} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <mask id={mask}>
        <rect width="16" height="16" fill="white" />
        <path d="M9.15363 4.13565C8.80368 3.51248 8.02873 3.29888 7.42271 3.65857C6.81668 4.01827 6.60914 4.81504 6.95911 5.43821L10.3274 11.4359C10.6774 12.0591 11.4523 12.2727 12.0583 11.913C12.6644 11.5533 12.8719 10.7565 12.5219 10.1333L9.15363 4.13565Z" fill="black" fillOpacity={0.6} />
        <path d="M10.381 6.35472C9.24621 5.74305 8.48706 6.58306 8.15521 7.09233C8.10217 7.17274 8.05322 7.25587 8.00849 7.34139C7.98493 7.38503 7.97213 7.41546 7.96743 7.42581C7.96273 7.43623 7.96743 7.42581 7.96743 7.42929L7.52862 8.20838L5.7154 11.4363C5.54743 11.7354 5.27075 11.9537 4.94624 12.0431C4.62172 12.1325 4.27595 12.0857 3.98499 11.913C3.69403 11.7403 3.48171 11.4559 3.39474 11.1223C3.30778 10.7887 3.35328 10.4332 3.52126 10.134L6.65835 4.54808L6.88985 4.13292C7.00124 3.93514 7.16137 3.77101 7.35412 3.65707C7.5468 3.54313 7.76529 3.4834 7.98765 3.48389H8.03674C8.25931 3.48375 8.478 3.54393 8.67068 3.65836C8.86343 3.7728 9.02343 3.93744 9.13448 4.13569L10.381 6.35472Z" fill="black" />
      </mask>
      <circle cx="8" cy="8" r="8" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}

const LINKS: { name: string; href: string; Mark: (p: { color: boolean }) => ReactNode }[] = [
  { name: 'gno.land', href: CONFIG.GNOLAND_URL, Mark: GnolandMark },
  { name: 'Gnoscan', href: CONFIG.GNOSCAN_URL, Mark: GnoscanMark },
  { name: 'GnoSwap', href: CONFIG.GNOSWAP_URL, Mark: GnoswapMark },
  { name: 'Adena', href: CONFIG.ADENA_URL, Mark: AdenaMark },
];

/** gno.land ecosystem links in the footer. */
export function EcosystemLinks() {
  return (
    <nav className="gw-eco" aria-label="gno.land ecosystem">
      {LINKS.map(({ name, href, Mark }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer">
          <span className="gw-eco-mark gw-eco-mono"><Mark color={false} /></span>
          <span className="gw-eco-mark gw-eco-color"><Mark color /></span>
          {name}
        </a>
      ))}
    </nav>
  );
}
