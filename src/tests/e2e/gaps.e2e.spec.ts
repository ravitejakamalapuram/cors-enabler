import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(dir, '../../../dist');
const APP = 'http://localhost:3000';
const API = 'http://localhost:4000';

let context: BrowserContext;
let extId: string;

async function openOptions(): Promise<Page> {
  const p = await context.newPage();
  await p.goto(`chrome-extension://${extId}/options.html`);
  await p.waitForSelector('[data-testid="options-root"]');
  return p;
}

async function setEnabled(enabled: boolean): Promise<void> {
  const p = await openOptions();
  const current = (await p.getByTestId('engine-state').innerText()).trim();
  if ((current === 'ENABLED') !== enabled) {
    await p.getByTestId('status-toggle-btn').click();
    await expect(p.getByTestId('engine-state')).toHaveText(enabled ? 'ENABLED' : 'DISABLED');
  }
  await p.close();
}

async function setCredentials(on: boolean): Promise<void> {
  const p = await openOptions();
  await p.getByTestId('nav-settings').click();
  const sw = p.getByTestId('set-credentials-switch');
  if ((await sw.isChecked()) !== on) await sw.locator('xpath=..').click();
  await p.waitForTimeout(600);
  await p.close();
}

async function appPage(): Promise<Page> {
  const app = await context.newPage();
  await app.goto(APP);
  return app;
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
  extId = new URL(sw.url()).host;
});

test.afterAll(async () => {
  await context?.close();
});

test('lets credentialed requests read custom response headers', async () => {
  await setEnabled(true);
  await setCredentials(true);
  const app = await appPage();
  const total = await app.evaluate(async (api) => {
    const r = await fetch(`${api}/headers`, { credentials: 'include' });
    return r.headers.get('x-total-count');
  }, API);
  await setCredentials(false);
  expect(total).toBe('5');
  await app.close();
});

test('loads a crossorigin image', async () => {
  await setEnabled(true);
  await setCredentials(false);
  const app = await appPage();
  const loaded = await app.evaluate(
    (api) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = `${api}/pixel.png?t=${Date.now()}`;
      }),
    API,
  );
  expect(loaded).toBe(true);
  await app.close();
});
