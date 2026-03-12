'use strict';

const { getAccountContext }        = require('../browser');
const { loadCookies, saveCookies } = require('../session');
const { delay, humanScroll }       = require('../humanBehavior');
const { checkAndIncrement }        = require('../rateLimit');

async function readMessages({ accountId, proxyUrl, limit = 20 }) {
  await checkAndIncrement(accountId, 'inboxReads'); // FIRST — before any browser work

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

    await page.goto('https://www.linkedin.com/messaging/', {
      waitUntil: 'domcontentloaded',
      timeout:   30000,
    });

    await delay(2000, 4000);

    await page.waitForSelector('[data-view-name="messaging-threads"]', { timeout: 15000 })
      .catch(() => null);

    await humanScroll(page, 300);
    await delay(1000, 2000);

    const chats = await page.evaluate((maxItems) => {
      const items   = [];
      const threads = document.querySelectorAll(
        '.msg-conversation-listitem, [data-view-name="messaging-thread-list-item"]'
      );

      for (const thread of Array.from(threads).slice(0, maxItems)) {
        try {
          const nameEl    = thread.querySelector('.msg-conversation-listitem__participant-names, .truncate');
          const previewEl = thread.querySelector('.msg-conversation-listitem__message-snippet, .truncate.t-12');
          const timeEl    = thread.querySelector('time, .msg-conversation-listitem__time-stamp');
          const unreadEl  = thread.querySelector('.msg-conversation-listitem__unread-count, [data-test-icon="unread-badge-icon"]');
          const linkEl    = thread.closest('a') || thread.querySelector('a');
          const avatarEl  = thread.querySelector('img');

          const href    = linkEl?.href || '';
          const idMatch = href.match(/\/messaging\/thread\/([^/]+)/);
          const chatId  = idMatch ? idMatch[1] : `unknown-${Date.now()}`;

          items.push({
            id:           chatId,
            accountId:    '', // filled in by caller — not accessible inside browser context
            participants: [{
              id:         chatId,
              name:       nameEl?.textContent?.trim()   || 'Unknown',
              avatarUrl:  avatarEl?.src                 || null,
              profileUrl: null,
            }],
            unreadCount:  unreadEl ? 1 : 0,
            lastMessage:  previewEl ? {
              id:        `preview-${chatId}`,
              chatId,
              senderId:  '',
              text:      previewEl.textContent?.trim() || '',
              createdAt: timeEl?.getAttribute('datetime') || new Date().toISOString(),
              isRead:    !unreadEl,
            } : null,
            createdAt: timeEl?.getAttribute('datetime') || new Date().toISOString(),
          });
        } catch (_) { /* skip malformed item */ }
      }
      return items;
    }, limit);

    // Inject accountId server-side — not available inside browser context
    chats.forEach((c) => { c.accountId = accountId; });

    await saveCookies(accountId, await context.cookies());

    return { items: chats, cursor: null, hasMore: false };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

module.exports = { readMessages };
