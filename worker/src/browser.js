// FILE: worker/src/browser.js
'use strict';

// Playwright browser/context pool with storageState restore from PostgreSQL.
// Uses patchright — a drop-in Playwright replacement with CDP-level stealth patches
// that eliminate the Runtime.enable leak and AutomationControlled fingerprint.

const { chromium } = require('patchright');
const { loadStorageState } = require('./sessionStorage');

const CHROME_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--disable-features=IsolateOrigins,site-per-process,AutomationControlled',
  '--disable-blink-features=AutomationControlled',
  '--use-gl=egl', '--use-angle=swiftshader-webgl',
  '--window-size=1440,900', '--lang=en-US,en',
  '--disable-extensions', '--disable-infobars',
  '--no-first-run', '--no-default-browser-check',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-ipc-flooding-protection', '--disable-hang-monitor',
  '--metrics-recording-only', '--mute-audio',
  '--password-store=basic', '--use-mock-keychain',
  '--disable-component-update', '--disable-client-side-phishing-detection',
  '--disable-sync', '--disable-translate', '--hide-scrollbars', '--disable-logging',
  '--ssl-version-min=tls1.2', '--remote-debugging-port=0',
];

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const VIEWPORT_POOL = [
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Launch a stealth Chrome browser instance.
 * @param {string|undefined} proxyUrl  Optional proxy e.g. "http://user:pass@host:port"
 */
async function createBrowser(proxyUrl) {
  const opts = {
    headless:       false, // NEVER headless — LinkedIn detects it
    executablePath: '/usr/bin/google-chrome-stable',
    args:           CHROME_ARGS,
  };
  if (proxyUrl) opts.proxy = { server: proxyUrl };
  return chromium.launch(opts);
}

/**
 * Create a browser context with full fingerprint spoofing using random UA + viewport.
 */
async function createContext(browser) {
  const userAgent = pickRandom(UA_POOL);
  const viewport  = pickRandom(VIEWPORT_POOL);

  const context = await browser.newContext({
    userAgent,
    viewport,
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

  const vw = viewport.width;
  const vh = viewport.height;

  await context.addInitScript((vw, vh) => {
    // ── webdriver ───────────────────────────────────────────────────────────
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch (_) {}
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // ── plugins ─────────────────────────────────────────────────────────────
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin',  filename: 'internal-pdf-viewer',             description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer',  filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client',      filename: 'internal-nacl-plugin',            description: '' },
      ],
    });

    // ── language / concurrency / memory ─────────────────────────────────────
    Object.defineProperty(navigator, 'languages',           { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
    Object.defineProperty(navigator, 'deviceMemory',        { get: () => 8 });

    // ── screen (matches selected viewport) ──────────────────────────────────
    Object.defineProperty(screen, 'width',       { get: () => vw });
    Object.defineProperty(screen, 'height',      { get: () => vh });
    Object.defineProperty(screen, 'availWidth',  { get: () => vw });
    Object.defineProperty(screen, 'availHeight', { get: () => vh - 40 });
    Object.defineProperty(screen, 'colorDepth',  { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth',  { get: () => 24 });

    // ── network ─────────────────────────────────────────────────────────────
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        Object.defineProperty(conn, 'rtt',           { get: () => 50 });
        Object.defineProperty(conn, 'downlink',      { get: () => 10 });
        Object.defineProperty(conn, 'effectiveType', { get: () => '4g' });
        Object.defineProperty(conn, 'saveData',      { get: () => false });
      }
    } catch (_) {}

    // ── chrome runtime guard ────────────────────────────────────────────────
    if (!window.chrome) {
      window.chrome = {
        app:     {},
        runtime: {
          onConnect:  { addListener: () => {} },
          onMessage:  { addListener: () => {} },
          connect:    () => {},
          sendMessage:() => {},
          id:         undefined,
          getManifest:() => ({}),
          getURL:     (p) => p,
        },
      };
    }

    // ── permissions API ─────────────────────────────────────────────────────
    const originalQuery = window.Permissions && window.Permissions.prototype.query;
    if (originalQuery) {
      window.Permissions.prototype.query = function (parameters) {
        return parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission, onchange: null })
          : originalQuery.call(this, parameters);
      };
    }

    // ── Canvas noise ────────────────────────────────────────────────────────
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, ...args) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const d = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < d.data.length; i += 100)
          d.data[i] = (d.data[i] + (Math.random() < 0.5 ? 1 : -1) + 256) % 256;
        ctx.putImageData(d, 0, 0);
      }
      return origToDataURL.call(this, type, ...args);
    };

    // ── WebGL spoof ─────────────────────────────────────────────────────────
    const _getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
      if (p === 37445) return 'Intel Inc.';
      if (p === 37446) return 'Intel Iris OpenGL Engine';
      return _getParam.call(this, p);
    };

    // ── AudioContext noise ──────────────────────────────────────────────────
    const _getChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(ch) {
      const a = _getChannelData.call(this, ch);
      for (let i = 0; i < a.length; i += 100) a[i] += (Math.random() - 0.5) * 0.0001;
      return a;
    };
  }, vw, vh);

  // Block unnecessary resources
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,mp4,woff,woff2}', (r) => r.abort());
  await context.route('**/li/track**',  (r) => r.abort());
  await context.route('**/beacon**',    (r) => r.abort());
  await context.route('**/analytics**', (r) => r.abort());

  return context;
}

const activeContexts = new Map();

/**
 * Get or create a browser context for a LinkedIn account.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId            - Required for loadStorageState
 * @param {string|null} proxyUrl
 * @returns {{ browser, context, cookiesLoaded: boolean }}
 */
async function getAccountContext(linkedInAccountId, userId, proxyUrl) {
  const existing = activeContexts.get(linkedInAccountId);
  if (existing) {
    clearTimeout(existing.timer);
    existing.lastUsed = Date.now();
    existing.timer = setTimeout(() => cleanupContext(linkedInAccountId), 10 * 60 * 1000);
    return { browser: existing.browser, context: existing.context, cookiesLoaded: true };
  }

  // LRU eviction — cap at 8 contexts
  if (activeContexts.size >= 8) {
    let oldestId   = null;
    let oldestTime = Infinity;
    for (const [id, ctx] of activeContexts.entries()) {
      if (ctx.lastUsed < oldestTime) { oldestTime = ctx.lastUsed; oldestId = id; }
    }
    if (oldestId) await cleanupContext(oldestId);
  }

  const browser = await createBrowser(proxyUrl);
  const context = await createContext(browser);

  let cookiesLoaded = false;
  if (userId) {
    const storageState = await loadStorageState(linkedInAccountId, userId);
    if (storageState) {
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

      if (storageState.origins && storageState.origins.length > 0) {
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

  const timer = setTimeout(() => cleanupContext(linkedInAccountId), 10 * 60 * 1000);
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

process.on('SIGTERM', async () => { await cleanupAllContexts(); process.exit(0); });
process.on('SIGINT',  async () => { await cleanupAllContexts(); process.exit(0); });

module.exports = { createBrowser, createContext, getAccountContext, cleanupContext, cleanupAllContexts };
