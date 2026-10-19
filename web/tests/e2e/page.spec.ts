import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const ADDR = 'g1wrappedsampleqqqqqqqqqqqqqqqqqqqqqqqqq';
const UNKNOWN = 'g1wrappedemptyqqqqqqqqqqqqqqqqqqqqqqqqqq';
const SECTIONS = ['Arrival', 'Activity', 'Top realms', 'Builder', 'DeFi', 'Fuel'];

// Wait for hydration so clicks aren't lost on server-rendered HTML.
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator('[data-hydrated]').waitFor();
}

async function sections(page: Page) {
  const shown: string[] = [];
  for (const s of SECTIONS) if (await page.getByRole('region', { name: s, exact: true }).count()) shown.push(s);
  return shown;
}

/** Nothing sticks out of the viewport horizontally (catches pixel art, not just text). */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const out = document.documentElement.scrollWidth > W + 1 ? ['page scrolls sideways'] : [];
    for (const el of document.querySelectorAll('main *, header *')) {
      if (el.closest('#gw-summary-export')) continue;
      const b = el.getBoundingClientRect();
      if (b.width && (b.right > W + 1 || b.left < -1)) out.push((el.textContent || el.tagName).trim().slice(0, 40));
    }
    return out;
  });
}

test.describe('recap page', () => {
  test('full: every section, persona and headline stats', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Realm Hopper');
    expect(await sections(page)).toEqual(SECTIONS);
    const glance = page.getByRole('region', { name: 'Season at a glance' });
    await expect(glance).toContainText('1,284');
    await expect(glance).toContainText('87%');
  });

  test('hide rules: newcomer has no Builder or DeFi', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=newcomer`);
    expect(await sections(page)).toEqual(['Arrival', 'Activity', 'Top realms', 'Fuel']);
  });

  test('whale: Top 1%, Day 1 line, high fuel tier', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=whale`);
    await expect(page.getByRole('region', { name: 'Season at a glance' })).toContainText('Top 1%');
    await expect(page.getByText('You were here from the start.')).toBeVisible();
    await expect(page.getByText('You kept the validators well fed.')).toBeVisible();
  });

  test('long realm path expands on tap', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=whale`);
    await page.getByRole('region', { name: 'Top realms' }).getByRole('button', { expanded: false }).first().click();
    await expect(page.getByText('multi_hop_swap/router').first()).toBeVisible();
  });

  test('missing season shows the DATA ERROR banner', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=missing-season`);
    await expect(page.getByRole('alert').filter({ hasText: 'DATA ERROR' })).toContainText('season is missing');
  });

  test('share: copy link, download image, OG preview', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, `/s1/${ADDR}?fixture=full`);
    const share = page.getByRole('region', { name: 'Share your Wrapped' });
    await share.getByRole('button', { name: 'Copy for Discord' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^My Mainnet Season 1 on gno\.land 🎁\n\n🏷️ Persona: Realm Hopper/);
    await share.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByRole('status')).toHaveText('Link copied');
    // share links use the share ID, never the address
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://localhost:3200/s1/s/fxfull000000');

    const [download] = await Promise.all([page.waitForEvent('download'), share.getByRole('button', { name: 'Download image' }).click()]);
    expect(download.suggestedFilename()).toBe('gno-wrapped-s1.png');
    const png = Buffer.concat(await (await download.createReadStream()).toArray());
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1920]);

    const og = share.getByRole('img', { name: /^Share card/ });
    await expect.poll(() => og.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);
  });

  test('nav Share scrolls to the share section', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`);
    await page.getByRole('banner').getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('heading', { name: 'Share your Wrapped' })).toBeInViewport();
  });

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    test(`no horizontal overflow at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      for (const ds of ['full', 'whale', 'newcomer']) {
        await open(page, `/s1/${ADDR}?fixture=${ds}`);
        expect(await overflowing(page), ds).toEqual([]);
      }
      await open(page, '/');
      expect(await overflowing(page), 'intro').toEqual([]);
    });
  }
});

test.describe('share view (/s1/s/<id>)', () => {
  test('no trace of the address anywhere in the page', async ({ page }) => {
    await open(page, `/s1/s/fxfull000000?fixture=full`);
    const html = await page.content();
    for (const leak of [ADDR, ADDR.slice(0, 6), ADDR.slice(-4), 'gnoscan.io/account', 'txhash=', '"order":312']) {
      expect(html, leak).not.toContain(leak);
    }
    expect(html, '#312').not.toMatch(/#312(?![0-9a-f])/i); // the order, not a badge color like #312470
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Realm Hopper');
    await expect(page.getByText('One of the first 500 on mainnet').first()).toBeVisible(); // the tier, not the order
  });

  test('offers "unwrap your own" instead of the share tools', async ({ page }) => {
    await open(page, `/s1/s/fxfull000000?fixture=full`);
    const cta = page.getByRole('region', { name: 'Get your own Gno Wrapped' });
    await expect(cta.getByRole('link', { name: 'Unwrap your own' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('button', { name: 'Download image' })).toHaveCount(0);
    await expect(page.locator('#gw-summary-export')).toHaveCount(0);
  });

  test('masked realm paths have no Gnoscan link', async ({ page }) => {
    await open(page, `/s1/s/fxwhale00000?fixture=whale`);
    const builder = page.getByRole('region', { name: 'Builder' });
    await expect(builder).toContainText('gno.land/r/…/vault');
    await expect(builder.getByRole('link')).toHaveCount(0);
  });
});

test.describe('achievements and timeline', () => {
  test('recap lists achievements, arrival order and the season timeline', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`);
    const ach = page.getByRole('region', { name: 'Achievements' });
    await expect(ach.locator('.gw-ach')).toHaveCount(3);
    await expect(ach.locator('.gw-ach-title')).toHaveText(['Early Arrival', 'On a Roll', 'Triple Threat']);
    await expect(ach).toContainText('9 days in a row on gno.land.');
    await expect(page.getByText('#312 of 5,029 to arrive on mainnet')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Season timeline' }).locator('li')).toHaveCount(4);
  });

  test('no achievements, no section', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=newcomer`);
    await expect(page.getByRole('region', { name: 'Achievements' })).toHaveCount(0);
  });

  test('/personas lists all achievements', async ({ page }) => {
    await page.goto('/personas#achievements');
    await expect(page.locator('#achievements .gw-ach')).toHaveCount(6);
  });

  test('intro shows the live ticker (needs the api with batch output)', async ({ page }) => {
    await page.goto('/');
    const live = page.getByLabel('Live season stats');
    try {
      await live.waitFor({ timeout: 8000 });
    } catch {
      test.skip(true, 'no batch output for the api');
    }
    await expect(live).toContainText(/LIVE\s*[\d,]+ addresses\s*[\d,]+ transactions\s*block #[\d,]+/);
    const block = live.getByRole('link', { name: /^Block [\d,]+ on Gnoscan$/ });
    await expect(block).toHaveAttribute('href', /^https:\/\/gnoscan\.io\/block\/\d+$/);
    await expect(block).toHaveAttribute('target', '_blank');
  });
});

test.describe('personas', () => {
  test('recap explains its persona and opens /personas in a new tab', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`);
    await expect(page.getByText('You called')).toBeVisible();
    const [tab] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: /How personas work/ }).click()]);
    await expect(tab).toHaveURL(/\/personas$/);
    await expect(tab.getByRole('heading', { level: 1 })).toHaveText('Eight personas, one per address');
    await expect(page).toHaveURL(new RegExp(`/s1/${ADDR}`)); // the recap stays open
  });

  test('recap shows its rank within the persona; the shared view too', async ({ page }) => {
    for (const url of [`/s1/${ADDR}?fixture=full`, `/s1/s/fxfull000000?fixture=full`]) {
      await open(page, url);
      const rank = page.getByLabel('Persona rank');
      await expect(rank).toContainText('#12 of 221 Realm Hoppers');
      await expect(rank).toContainText('top 6%');
      await expect(rank).toContainText('ranked by different realms called');
    }
    await open(page, `/s1/${ADDR}?fixture=newcomer`); // First Steps: no rank
    await expect(page.getByLabel('Persona rank')).toHaveCount(0);
  });

  test('/personas lists the rules in order (needs the api with batch output)', async ({ page }) => {
    await page.goto('/personas');
    const cards = page.locator('.gw-persona-card');
    if (await page.getByText("Persona data isn't available").count()) test.skip(true, 'no batch output for the api');
    await expect(cards).toHaveCount(8);
    await expect(cards.first()).toContainText('Builder');
    await expect(cards.last()).toContainText('First Steps');
    await expect(cards.nth(3)).toContainText('Ranked by GnoSwap and wugnot moves.');
    await expect(page.getByText('there is no public list')).toBeVisible();
  });
});

test.describe('links out', () => {
  test('Gnoscan: account, first tx, realms, deployed realms; GnoSwap portfolio', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`);
    await expect(page.getByRole('banner').getByRole('link', { name: /View on Gnoscan/ })).toHaveAttribute('href', `https://gnoscan.io/account/${ADDR}`);
    const realms = page.getByRole('region', { name: 'Top realms' });
    await expect(realms.getByRole('link', { name: 'Open gno.land/r/demo/boards on Gnoscan' }).first())
      .toHaveAttribute('href', 'https://gnoscan.io/realms/details?path=gno.land/r/demo/boards');
    await expect(page.getByRole('region', { name: 'Builder' }).getByRole('link').first())
      .toHaveAttribute('href', /^https:\/\/gnoscan\.io\/realms\/details\?path=gno\.land\/r\//);
    await expect(page.getByRole('region', { name: 'DeFi' }).getByRole('link', { name: /GnoSwap portfolio/ })).toHaveAttribute('href', 'https://gnoswap.io/portfolio');
    const x = new URL((await page.getByRole('link', { name: 'Share to X' }).getAttribute('href'))!);
    expect(x.origin + x.pathname).toBe('https://x.com/intent/tweet');
    expect(x.searchParams.get('text')).toContain('🏷️ Persona: Realm Hopper\n📈 1,284 transactions');
    expect(x.searchParams.get('text')).toContain('Unwrap yours 👇\nhttp://localhost:3200/s1/s/fxfull000000');
    for (const a of await page.locator('a[href^="https://gno"]').all()) {
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
  });

  test('first transaction link URL-encodes the base64 hash', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`); // web/fixtures/full.json carries a real gnoland-1 hash
    await expect(page.getByRole('link', { name: /first transaction/ }))
      .toHaveAttribute('href', 'https://gnoscan.io/transactions/details?txhash=6rc%2FwoCBRr4OkFdEhgfDEVYBPRYRa2uW9vOP4jbZ52g%3D');
  });

  test('no hash, no first-transaction link', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=whale`);
    await expect(page.getByRole('link', { name: /first transaction/ })).toHaveCount(0);
  });
});

test.describe('scroll reveal', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('sections below the fold rise in when scrolled to', async ({ page }) => {
    await open(page, `/s1/${ADDR}?fixture=full`);
    const share = page.getByRole('region', { name: 'Share your Wrapped' });
    await expect(share).toHaveCSS('opacity', '0');
    await share.scrollIntoViewIfNeeded();
    await expect(share).toHaveCSS('opacity', '1');
    await expect(share).toHaveClass(/gw-in/);
  });

  test('reduced motion shows everything at once', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await open(page, `/s1/${ADDR}?fixture=full`);
    await expect(page.getByRole('region', { name: 'Share your Wrapped' })).toHaveCSS('opacity', '1');
    await ctx.close();
  });
});

test.describe('intro and empty', () => {
  test('footer links to the gno.land ecosystem in new tabs', async ({ page }) => {
    await open(page, '/');
    const eco = page.getByRole('navigation', { name: 'gno.land ecosystem' });
    for (const [name, href] of [['gno.land', 'https://gno.land'], ['Gnoscan', 'https://gnoscan.io'], ['GnoSwap', 'https://gnoswap.io'], ['Adena', 'https://adena.app']]) {
      const link = eco.getByRole('link', { name });
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
    }
  });

  test('intro validates the address and opens the recap', async ({ page }) => {
    await open(page, '/');
    await page.getByLabel('Wallet address').fill('not-an-address');
    await page.getByRole('button', { name: 'Unwrap' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'address' })).toContainText("doesn't look like a gno.land address");
    await page.getByRole('button', { name: 'Active wallet' }).click();
    await page.getByRole('button', { name: 'Unwrap' }).click();
    await expect(page).toHaveURL(new RegExp(`/s1/${ADDR}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Realm Hopper');
  });

  test('Connect Adena without the extension explains what to do', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('button', { name: 'Connect Adena' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Adena' })).toContainText('Adena wallet not found');
  });

  test('an address the API has no recap for shows EmptyState', async ({ page }) => {
    await page.goto(`/s1/${UNKNOWN}`);
    await expect(page.getByText('Your story starts next season.')).toBeVisible();
  });
});
