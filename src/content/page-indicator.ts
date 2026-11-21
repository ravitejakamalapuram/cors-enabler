import { INDICATOR_UPDATE, type IndicatorUpdateMessage } from '@/shared/indicator';

/**
 * Small "CORS ON" pill in the corner of every top-level page while CORS
 * Enabler is on, so a forgotten global toggle is visible where the breakage
 * shows up. It never reads page content and has no access to extension
 * storage: it asks the service worker for one boolean (CORS_INDICATOR_STATE)
 * and listens for pushes. Rendered in a closed shadow root so page CSS cannot
 * restyle it. Dismissal lasts until the page is reloaded.
 */
const HOST_TAG = 'cors-enabler-indicator';
let host: HTMLElement | null = null;
let dismissed = false;

function mount(): HTMLElement {
  const el = document.createElement(HOST_TAG);
  // Inline !important beats page stylesheets, so a page cannot hide or move it.
  for (const [prop, value] of [
    ['all', 'initial'],
    ['display', 'block'],
    ['visibility', 'visible'],
    ['opacity', '1'],
    ['position', 'fixed'],
    ['right', '12px'],
    ['bottom', '12px'],
    ['z-index', '2147483647'],
  ] as const) {
    el.style.setProperty(prop, value, 'important');
  }
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

let orphanTimer: ReturnType<typeof setInterval> | undefined;

function render(show: boolean): void {
  if (show && !dismissed && !host) {
    host = mount();
    document.documentElement.append(host);
    // A local property check, no messaging: removes the pill within a few
    // seconds of an extension reload or update, which stops our pushes.
    orphanTimer = setInterval(() => {
      if (orphaned()) render(false);
    }, 3000);
  } else if (!(show && !dismissed) && host) {
    host.remove();
    host = null;
    clearInterval(orphanTimer);
  }
}

/** After an extension reload or update this script is orphaned and gets no more pushes. */
function orphaned(): boolean {
  return !chrome.runtime?.id;
}

async function init(): Promise<void> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'CORS_INDICATOR_STATE' })) as
      { ok?: boolean; data?: unknown } | undefined;
    render(res?.ok === true && res.data === true);
  } catch {
    render(false);
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  const m = message as Partial<IndicatorUpdateMessage> | null;
  if (sender.id === chrome.runtime.id && m?.type === INDICATOR_UPDATE) render(m.show === true);
});
void init();
