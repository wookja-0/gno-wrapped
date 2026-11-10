import { expect, test as base } from '@playwright/test';

// A production build logs React errors by code only: 418, 423 and 425 are the hydration ones.
const HYDRATION = /hydrat|Minified React error #(418|423|425)\b/i;

/** Fails any test whose page logs a React hydration error. */
export const test = base.extend<{ hydrationGuard: void }>({
  hydrationGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => { if (HYDRATION.test(e.message)) errors.push(e.message.slice(0, 300)); });
      page.on('console', (m) => { if (m.type() === 'error' && HYDRATION.test(m.text())) errors.push(m.text().slice(0, 300)); });
      await use();
      expect(errors, 'hydration errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
