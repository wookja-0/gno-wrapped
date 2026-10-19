/**
 * Every launch placeholder lives here.
 */
export const CONFIG = {
  // TODO: production origin. Share links are SHARE_BASE_URL/<season.id>/<address>.
  SHARE_BASE_URL: process.env.NEXT_PUBLIC_SHARE_BASE_URL ?? 'https://wrapped.example',
  // TODO: confirm hashtag and share copy with marketing.
  SHARE_HASHTAG: '#GnoWrapped',
  // Season the intro screen shows and sends people to (must match the batch's season).
  CURRENT_SEASON: { id: 's1', start: '2026-09-12', end: '2026-12-31' },
  // TODO: confirm. Download file name; {season} is replaced by season.id.
  DOWNLOAD_FILENAME: 'gno-wrapped-{season}.png',
  // FuelSlide line tiers in GNOT, from the real distribution (p90 ≈ 0.96, p99 ≈ 13 on 2026-10-19).
  GAS_TIERS: { MID_FROM: 1, HIGH_FROM: 10 },
  // Explorer / DEX the recap links out to. Gnoscan defaults to mainnet (gnoland-1), so no chain param.
  GNOSCAN_URL: 'https://gnoscan.io',
  // GnoSwap's portfolio shows the connected wallet only; there's no per-address page to link to.
  GNOSWAP_PORTFOLIO_URL: 'https://gnoswap.io/portfolio',
  // Footer ecosystem links.
  GNOLAND_URL: 'https://gno.land',
  GNOSWAP_URL: 'https://gnoswap.io',
  ADENA_URL: 'https://adena.app',
  // BuilderSlide shows at most this many cards, then "+N more" (real max is 300+ realms).
  BUILDER_MAX_CARDS: 3,
  // TODO: the prototype's "Try a sample" buttons. Shown only in fixture mode (dev/tests) until there's
  // a real sample address to show in production.
  SHOW_SAMPLE_BUTTONS: process.env.NEXT_PUBLIC_WRAPPED_FIXTURES === '1',
  // Fixture-mode sample addresses (web/fixtures).
  SAMPLE_ACTIVE_ADDRESS: 'g1wrappedsampleqqqqqqqqqqqqqqqqqqqqqqqqq',
  SAMPLE_EMPTY_ADDRESS: 'g1wrappedemptyqqqqqqqqqqqqqqqqqqqqqqqqqq',
} as const;
