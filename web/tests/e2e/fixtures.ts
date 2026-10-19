import { expect, test as base } from '@playwright/test';

/** Fails any test whose page logs a React hydration error. */
export const test = base.extend<{ hydrationGuard: void }>({
  hydrationGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => { if (/hydrat/i.test(e.message)) errors.push(e.message.slice(0, 300)); });
      page.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text().slice(0, 300)); });
      await use();
      expect(errors, 'hydration errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
