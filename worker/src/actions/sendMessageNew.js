'use strict';

const { getAccountContext }                         = require('../browser');
const { loadCookies, saveCookies }                  = require('../session');
const { delay, humanClick, humanScroll, humanType } = require('../humanBehavior');
const { checkAndIncrement }                         = require('../rateLimit');
const { getRedis }                                  = require('../redisClient');

async function sendMessageNew({ accountId, profileUrl, text, proxyUrl }) {
  await checkAndIncrement(accountId, 'messagesSent'); // FIRST

  const { context } = await getAccountContext(accountId, proxyUrl);
  let page;

  try {
    const cookies = await loadCookies(accountId);
    if (!cookies) {
      const err = new Error(`No session for account ${accountId}`);
      err.code = 'NO_SESSION'; err.status = 401;
      throw err;
    }

    await context.addCookies(cookies);
    page = await context.newPage();

    // Navigate to recipient's profile (natural behaviour — not messaging directly)
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2500, 5000); // simulate reading the profile

    await humanScroll(page, 200);
    await delay(800, 1500);

    // Extract profile name near the Message button
    let participantName = 'Unknown';
    try {
      participantName = await page.evaluate(() => {
        const messageButton = document.querySelector('button[aria-label*="Message"], a[aria-label*="Message"]');
        const nearestCard   = messageButton?.closest('.pv-top-card, .ph5, .artdeco-card, main, section');
        const scopedName    = nearestCard?.querySelector('h1, [data-anonymize="person-name"], .text-heading-xlarge');
        const fallbackName  = document.querySelector('h1, [data-anonymize="person-name"], .text-heading-xlarge');
        const raw = scopedName?.textContent || fallbackName?.textContent || '';
        return raw.trim() || 'Unknown';
      });
    } catch (_) {}

    await humanClick(page, 'button[aria-label*="Message"], a[aria-label*="Message"]', { timeout: 10000 });
    await delay(1500, 3000);

    const composeSelector = '.msg-form__contenteditable, [contenteditable][role="textbox"]';
    await humanType(page, composeSelector, text, { timeout: 10000 });
    await delay(800, 1800);

    await humanClick(page, '.msg-form__send-button, button[type="submit"][aria-label*="Send"]');
    await delay(2000, 4000);

    // Extract new chat ID from URL — LinkedIn redirects to the thread after send
    const finalUrl = page.url();
    const idMatch  = finalUrl.match(/\/messaging\/thread\/([^/?]+)/);
    const chatId   = idMatch ? idMatch[1] : `new-${Date.now()}`; // fallback if no redirect

    await saveCookies(accountId, await context.cookies());

    const msgId = `sent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const redis = getRedis();
    const entry = JSON.stringify({
      type: 'messageSent',
      accountId,
      targetName: participantName,
      targetProfileUrl: profileUrl, // correct: real profile URL
      message: text,
      timestamp: Date.now(),
    });
    await redis.lpush(`activity:log:${accountId}`, entry);
    await redis.ltrim(`activity:log:${accountId}`, 0, 999);
    await redis.incr(`stats:messages:${accountId}`);

    return {
      id:        msgId,
      chatId,
      senderId:  '__self__',
      text,
      createdAt: new Date().toISOString(),
      isRead:    true,
    };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

module.exports = { sendMessageNew };
