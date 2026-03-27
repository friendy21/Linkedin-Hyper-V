'use strict';

// FILE: worker/src/actions/captureStorageState.js
// Opens a visible LinkedIn login window and waits for the user to authenticate.
// Once feed/dashboard URL is detected, captures context.storageState() and returns it.
// The result is saved to PostgreSQL by the caller (worker API endpoint).

const { createBrowser, createContext } = require('../browser');

const POLL_INTERVAL_MS   = 2_000;  // check URL every 2 seconds
const MAX_WAIT_MS        = 5 * 60 * 1000; // 5 minute timeout

const SUCCESS_URL_PATTERNS = [
  '/feed/',
  '/mynetwork/',
  '/in/me',
  '/dashboard/',
  'linkedin.com/feed',
  'linkedin.com/mynetwork',
];

function isSuccessUrl(url) {
  return SUCCESS_URL_PATTERNS.some((p) => url.includes(p));
}

/**
 * Launch a Chrome window on the LinkedIn login page and poll until the user
 * has logged in (URL changes to feed/dashboard). Then capture storageState.
 *
 * @param {object} data
 * @param {string} data.linkedInAccountId - For logging
 * @param {string|null} data.proxyUrl
 * @returns {Promise<object>} Playwright storageState object { cookies, origins }
 */
async function captureStorageState({ linkedInAccountId, proxyUrl }) {
  console.log(`[CaptureSession:${linkedInAccountId}] Opening LinkedIn login window...`);

  const browser = await createBrowser(proxyUrl);
  const context = await createContext(browser);
  let page;

  try {
    page = await context.newPage();

    // Navigate to LinkedIn login page
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout:   30_000,
    });

    console.log(`[CaptureSession:${linkedInAccountId}] Waiting for user to log in (up to 5 min)...`);

    // Poll until success URL or timeout
    const deadline = Date.now() + MAX_WAIT_MS;
    let lastUrl    = '';

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let currentUrl;
      try {
        currentUrl = page.url();
      } catch {
        // Page may have been navigated/closed — try again
        continue;
      }

      if (currentUrl !== lastUrl) {
        console.log(`[CaptureSession:${linkedInAccountId}] URL: ${currentUrl}`);
        lastUrl = currentUrl;
      }

      if (isSuccessUrl(currentUrl)) {
        console.log(`[CaptureSession:${linkedInAccountId}] Login detected! Capturing storageState...`);
        // Brief pause to let LinkedIn finish setting all cookies/localStorage
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        const storageState = await context.storageState();
        console.log(`[CaptureSession:${linkedInAccountId}] Captured ${storageState.cookies?.length || 0} cookies.`);
        return storageState;
      }

      // If user is on a checkpoint/verification page, wait for them to complete it
      // (we intentionally do NOT handle 2FA ourselves — user does it manually)
    }

    // Timeout
    const err    = new Error(`LinkedIn login timed out after 5 minutes for account ${linkedInAccountId}`);
    err.code     = 'LOGIN_TIMEOUT';
    err.status   = 408;
    throw err;
  } finally {
    if (page) await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = { captureStorageState };
