import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(dir, '../../../dist');
const APP = 'http://localhost:3000';

let context: BrowserContext;
let ext: Page;

/** Send a typed message to the service worker from an extension page (no UI involved). */
async function send(message: object): Promise<void> {
  const res = await ext.evaluate((m) => chrome.runtime.sendMessage(m), message);
  expect(res, JSON.stringify(res)).toMatchObject({ ok: true });
}

async function setInitiators(globalInitiatorDomains: string[]): Promise<void> {
  await send({ type: 'CORS_UPDATE_SETTINGS', payload: { globalInitiatorDomains } });
}

async function getResult(): Promise<string> {
  const app = await context.newPage();
  await app.goto(APP);
  await app.getByTestId('run-get').click();
  await expect(app.getByTestId('result-get')).not.toHaveText('—');
  const result = await app.getByTestId('result-get').innerText();
  await app.close();
  return result;
}

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
    args: [
      '--headless=new',
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-sandbox',
    ],
  });
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extId = new URL(sw.url()).host;
  ext = await context.newPage();
  await ext.goto(`chrome-extension://${extId}/options.html`);
  await ext.waitForSelector('[data-testid="options-root"]');
});

test.afterAll(async () => {
  await context?.close();
});

test('global rule honours globalInitiatorDomains', async () => {
  await send({ type: 'CORS_ENABLE' });
  try {
    // Default (no scoping): any page gets CORS headers.
    expect(await getResult()).toBe('success');

    // The page at localhost:3000 is not listed, so the global rule does not apply to it.
    await setInitiators(['example.com']);
    expect(await getResult()).toBe('blocked');

    // Listing the page's hostname (a port or scheme is stripped) turns the rule back on.
    await setInitiators(['http://LOCALHOST:3000/']);
    expect(await getResult()).toBe('success');
  } finally {
    await setInitiators([]);
    await send({ type: 'CORS_DISABLE' });
  }
});
