import { expect, test } from './fixtures';

// Share images: what the cards must be (size, type, no address), not their pixels.
const ADDR = 'g1wrappedsampleqqqqqqqqqqqqqqqqqqqqqqqqq';
const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

for (const ds of ['full', 'whale', 'newcomer']) {
  test(`${ds} ShareCardOG: owner and share routes render 1200x630`, async ({ request }) => {
    for (const url of [`/api/og/s1/${ADDR}?fixture=${ds}`, `/api/og/s1/s/fx0000000000?fixture=${ds}`]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      expect(res.headers()['content-type']).toBe('image/png');
      expect(pngSize(await res.body())).toEqual([1200, 630]);
    }
  });
}

test('ShareCardOG refuses a missing season', async ({ request }) => {
  expect((await request.get(`/api/og/s1/${ADDR}?fixture=missing-season`)).status()).toBe(422);
  expect((await request.get(`/api/og/s1/s/fx0000000000?fixture=missing-season`)).status()).toBe(422);
});

test('SummaryExport has no address', async ({ page }) => {
  await page.goto(`/s1/${ADDR}?fixture=full`);
  await page.locator('[data-hydrated]').waitFor();
  const text = await page.locator('#gw-summary-export').innerText();
  expect(text).toContain('Data as of');
  expect(text).not.toContain(ADDR.slice(0, 6));
});
