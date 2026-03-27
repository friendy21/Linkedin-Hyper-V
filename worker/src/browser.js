'use strict';

// FILE: worker/src/browser.js
// Playwright browser/context pool with storageState restore from PostgreSQL.
// Uses patchright — a drop-in Playwright replacement with CDP-level stealth patches
// that eliminate the Runtime.enable leak and AutomationControlled fingerprint.

const { chromium } = require('patchright');
const { loadStorageState } = require('./sessionStorage');

const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  // NOTE: Do NOT pass --disable-blink-features=AutomationControlled here.
  // Patchright patches this at the CDP level; the flag can conflict on some builds.
  '--disable-features=IsolateOrigins,site-per-process',
  '--use-gl=egl',
  '--use-angle=swiftshader-webgl',
  '--window-size=1366,768',
  '--start-maximized',
  '--lang=en-US,en',
  '--disable-extensions',
  '--disable-infobars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  // Additional stealth args
  '--disable-ipc-flooding-protection',
  '--disable-hang-monitor',
  '--metrics-recording-only',
  '--mute-audio',
  '--password-store=basic',
  '--use-mock-keychain',
];

/**
 * Launch a stealth Chrome browser instance.
 * @param {string|undefined} proxyUrl  Optional proxy e.g. "http://user:pass@host:port"
 */
async function createBrowser(proxyUrl) {
  const opts = {
    headless:       false, // NEVER headless — LinkedIn detects it
    executablePath: '/usr/bin/google-chrome-stable',
    // NOTE: Do NOT set channel: 'chrome' — patchright applies its patches to the
    // bundled Chromium. Passing channel forces an unpatched system Chrome binary
    // which defeats the purpose of patchright.
    args:           CHROME_ARGS,
  };
  if (proxyUrl) opts.proxy = { server: proxyUrl };
  return chromium.launch(opts);
}

/**
 * Create a browser context with full fingerprint spoofing.
 * Must be called before any page navigation.
 */
async function createContext(browser) {
  const context = await browser.newContext({
    userAgent:         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport:          { width: 1366, height: 768 },
    locale:            'en-US',
    timezoneId:        'America/New_York',
    colorScheme:       'light',
    deviceScaleFactor: 1,
    hasTouch:          false,
    isMobile:          false,
    javaScriptEnabled: true,
    permissions:       ['notifications'],
  });

  context.setDefaultTimeout(60000);
  context.setDefaultNavigationTimeout(60000);

  // Deep fingerprint hardening — runs before any navigation on every page.
  // Patchright already patches webdriver at the CDP level, but we keep
  // defence-in-depth overrides and add additional vectors.
  await context.addInitScript(() => {
    // ── webdriver ─────────────────────────────────────────────────────────────
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch (_) {}
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // ── plugins ───────────────────────────────────────────────────────────────
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin',  filename: 'internal-pdf-viewer',             description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer',  filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client',      filename: 'internal-nacl-plugin',            description: '' },
      ],
    });

    // ── language / concurrency / memory ───────────────────────────────────────
    Object.defineProperty(navigator, 'languages',           { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
    Object.defineProperty(navigator, 'deviceMemory',        { get: () => 8 });

    // ── screen ────────────────────────────────────────────────────────────────
    Object.defineProperty(screen, 'width',       { get: () => 1366 });
    Object.defineProperty(screen, 'height',      { get: () => 768 });
    Object.defineProperty(screen, 'availWidth',  { get: () => 1366 });
    Object.defineProperty(screen, 'availHeight', { get: () => 728 });
    Object.defineProperty(screen, 'colorDepth',  { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth',  { get: () => 24 });

    // ── network (navigator.connection) ────────────────────────────────────────
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        Object.defineProperty(conn, 'rtt',           { get: () => 50 });
        Object.defineProperty(conn, 'downlink',      { get: () => 10 });
        Object.defineProperty(conn, 'effectiveType', { get: () => '4g' });
        Object.defineProperty(conn, 'saveData',      { get: () => false });
      }
    } catch (_) {}

    // ── chrome runtime guard ──────────────────────────────────────────────────
    // Ensure window.chrome exists as a real Chrome browser exposes it.
    if (!window.chrome) {
      window.chrome = {
        app:     {},
        runtime: {
          onConnect:           { addListener: () => {} },
          onMessage:           { addListener: () => {} },
          connect:             () => {},
          sendMessage:         () => {},
          id:                  undefined,
          getManifest:         () => ({}),
          getURL:              (p) => p,
          PlatformOs:          { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
          PlatformArch:        { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
          RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
        },
      };
    }

    // ── permissions API ───────────────────────────────────────────────────────
    // Spoof permissions.query so it mimics a real browser (not deny-all).
    const originalQuery = window.Permissions && window.Permissions.prototype.query;
    if (originalQuery) {
      window.Permissions.prototype.query = function (parameters) {
        return parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission, onchange: null })
          : originalQuery.call(this, parameters);
      };
    }
  });

  // Block unnecessary resources to reduce bandwidth and avoid tracking beacons
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,mp4,woff,woff2}', (r) => r.abort());
  await context.route('**/li/track**',  (r) => r.abort());
  await context.route('**/beacon**',    (r) => r.abort());
  await context.route('**/analytics**', (r) => r.abort());

  return context;
}

const activeContexts = new Map();

/**
 * Get or create a browser context for a LinkedIn account.
 * On cache miss, loads storageState from PostgreSQL and restores cookies + localStorage.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId            - Required for key derivation in loadStorageState
 * @param {string|null} proxyUrl
 * @returns {{ browser, context, cookiesLoaded: boolean }}
 */
async function getAccountContext(linkedInAccountId, userId, proxyUrl) {
  const existing = activeContexts.get(linkedInAccountId);
  if (existing) {
    clearTimeout(existing.timer);
    existing.lastUsed = Date.now();
    existing.timer = setTimeout(() => cleanupContext(linkedInAccountId), 5 * 60 * 1000);
    return { browser: existing.browser, context: existing.context, cookiesLoaded: true };
  }

  // LRU eviction — cap at 5 contexts
  if (activeContexts.size >= 5) {
    let oldestId   = null;
    let oldestTime = Infinity;
    for (const [id, ctx] of activeContexts.entries()) {
      if (ctx.lastUsed < oldestTime) {
        oldestTime = ctx.lastUsed;
        oldestId   = id;
      }
    }
    if (oldestId) await cleanupContext(oldestId);
  }

  const browser = await createBrowser(proxyUrl);
  const context = await createContext(browser);

  // Restore storageState from PostgreSQL
  let cookiesLoaded = false;
  if (userId) {
    const storageState = await loadStorageState(linkedInAccountId, userId);
    if (storageState) {
      // Restore cookies
      if (storageState.cookies && storageState.cookies.length > 0) {
        const normalised = storageState.cookies.map((c) => ({
          ...c,
          sameSite: (() => {
            const v = (c.sameSite || '').toLowerCase();
            if (v === 'strict') return 'Strict';
            if (v === 'lax')    return 'Lax';
            return 'None';
          })(),
        }));
        await context.addCookies(normalised);
      }

      // Restore localStorage per origin
      if (storageState.origins && storageState.origins.length > 0) {
        // We need a page open on the origin to set localStorage
        for (const origin of storageState.origins) {
          if (!origin.localStorage || origin.localStorage.length === 0) continue;
          try {
            const page = await context.newPage();
            await page.goto(origin.origin, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            await page.evaluate((items) => {
              for (const { name, value } of items) {
                try { localStorage.setItem(name, value); } catch (_) {}
              }
            }, origin.localStorage);
            await page.close();
          } catch (_) { /* non-fatal */ }
        }
      }

      cookiesLoaded = true;
    }
  }

  const timer = setTimeout(() => cleanupContext(linkedInAccountId), 5 * 60 * 1000);
  activeContexts.set(linkedInAccountId, { browser, context, lastUsed: Date.now(), timer, userId });

  return { browser, context, cookiesLoaded };
}

async function cleanupContext(linkedInAccountId) {
  const existing = activeContexts.get(linkedInAccountId);
  if (existing) {
    clearTimeout(existing.timer);
    activeContexts.delete(linkedInAccountId);
    await existing.context.close().catch(() => {});
    await existing.browser.close().catch(() => {});
  }
}

async function cleanupAllContexts() {
  for (const linkedInAccountId of activeContexts.keys()) {
    await cleanupContext(linkedInAccountId);
  }
}

process.on('SIGTERM', async () => {
  await cleanupAllContexts();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await cleanupAllContexts();
  process.exit(0);
});

module.exports = { createBrowser, createContext, getAccountContext, cleanupContext, cleanupAllContexts };
