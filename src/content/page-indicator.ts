import { STORAGE_KEYS } from '@/shared/constants';
import { shouldShowIndicator } from '@/content/indicator-state';

/**
 * Small "CORS ON" pill in the corner of every top-level page while CORS
 * Enabler is on, so a forgotten global toggle is visible where the breakage
 * shows up. It only reads the enabled flag and settings from extension
 * storage; it never reads page content or sends anything anywhere. Rendered in
 * a closed shadow root so page CSS cannot restyle it and page scripts cannot
 * reach into it. Dismissal lasts until the page is reloaded.
 */
const HOST_TAG = 'cors-enabler-indicator';
let host: HTMLElement | null = null;
let dismissed = false;

function mount(): HTMLElement {
  const el = document.createElement(HOST_TAG);
  el.style.cssText =
    'all: initial; position: fixed; right: 12px; bottom: 12px; z-index: 2147483647;';
  const root = el.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 10px;
      border-radius: 999px; background: #d97706; color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3);
      font: 600 11px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: .02em;
      opacity: .92; user-select: none; }
    .pill:hover { opacity: 1; }
    button { all: unset; cursor: pointer; width: 16px; height: 16px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center; font-size: 13px; line-height: 1; }
    button:hover, button:focus-visible { background: rgba(255,255,255,.25); outline: none; }
  `;

  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.setAttribute('role', 'status');
  pill.title =
    'CORS Enabler is on and relaxing CORS for development. Turn it off from the toolbar when you are done.';
  const label = document.createElement('span');
  label.textContent = 'CORS ON';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Hide the CORS Enabler indicator on this page');
  close.addEventListener('click', () => {
    dismissed = true;
    render(false);
  });
  pill.append(label, close);
  root.append(style, pill);
  return el;
}

function render(show: boolean): void {
  if (show && !host) {
    host = mount();
    document.documentElement.append(host);
  } else if (!show && host) {
    host.remove();
    host = null;
  }
}

async function refresh(): Promise<void> {
  const raw = await chrome.storage.local.get([STORAGE_KEYS.enabled, STORAGE_KEYS.settings]);
  render(!dismissed && shouldShowIndicator(raw));
}

void refresh();
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === 'local' &&
    (STORAGE_KEYS.enabled in changes || STORAGE_KEYS.settings in changes)
  ) {
    void refresh();
  }
});
