import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(dir, '../../../dist');
const APP = 'http://localhost:3000';

let context: BrowserContext;
let extId: string;

async function serviceWorker(ctx: BrowserContext): Promise<Worker> {
  const existing = ctx.serviceWorkers();
  if (existing.length > 0) return existing[0]!;
  return ctx.waitForEvent('serviceworker', { timeout: 20_000 });
}

async function openOptions() {
  const p = await context.newPage();
  await p.goto(`chrome-extension://${extId}/options.html`);
  await p.waitForSelector('[data-testid="options-root"]');
  return p;
}

async function setEngine(enabled: boolean): Promise<void> {
  const p = await openOptions();
  const current = (await p.getByTestId('engine-state').innerText()).trim();
  if ((current === 'ENABLED') !== enabled) {
    await p.getByTestId('status-toggle-btn').click();
    await expect(p.getByTestId('engine-state')).toHaveText(enabled ? 'ENABLED' : 'DISABLED');
  }
  await p.close();
}

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--headless=new',
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-sandbox',
    ],
  });
  const sw = await serviceWorker(context);
  extId = new URL(sw.url()).host;
});

test.afterAll(async () => {
  await context?.close();
});

test('baseline — cross-origin GET is blocked when the extension is disabled', async () => {
  await setEngine(false);
  const app = await context.newPage();
  await app.goto(APP);
  await app.getByTestId('run-get').click();
  await expect(app.getByTestId('result-get')).toHaveText('blocked');
  await app.close();
});

test('enabled — GET, POST(JSON) and Authorization requests succeed', async () => {
  await setEngine(true);
  const app = await context.newPage();
  await app.goto(APP);
  for (const [btn, res] of [
    ['run-get', 'result-get'],
    ['run-post', 'result-post'],
    ['run-auth', 'result-auth'],
  ] as const) {
    await app.getByTestId(btn).click();
    await expect(app.getByTestId(res)).toHaveText('success');
  }
  await app.close();
});

test('credentialed request requires credentials mode (honest limitation)', async () => {
  await setEngine(true);

  // Default (credentials off → wildcard origin): credentialed call stays blocked.
  let app = await context.newPage();
  await app.goto(APP);
  await app.getByTestId('run-cred').click();
  await expect(app.getByTestId('result-cred')).toHaveText('blocked');
  await app.close();

  // Turn credentials mode ON (origin defaults to http://localhost:3000).
  const opt = await openOptions();
  await opt.getByTestId('nav-settings').click();
  const sw = opt.getByTestId('set-credentials-switch');
  if (!(await sw.isChecked())) await sw.locator('xpath=..').click();
  await expect(sw).toBeChecked();
  await opt.waitForTimeout(600);
  await opt.close();

  // Now the credentialed request succeeds.
  app = await context.newPage();
  await app.goto(APP);
  await app.getByTestId('run-cred').click();
  await expect(app.getByTestId('result-cred')).toHaveText('success');
  await app.close();

  // Reset for idempotency.
  const opt2 = await openOptions();
  await opt2.getByTestId('nav-settings').click();
  const sw2 = opt2.getByTestId('set-credentials-switch');
  if (await sw2.isChecked()) await sw2.locator('xpath=..').click();
  await opt2.close();
});
