'use strict';

// FILE: worker/src/actions/scrapeNotifications.js
// Scrapes LinkedIn notifications page and upserts to the Notification table.
// Uses LinkedIn's own notification ID as a dedup key.

const { getAccountContext } = require('../browser');
const { getPrisma }         = require('../db/prisma');
const { emitNewNotification } = require('../utils/websocket');
const { delay }             = require('../humanBehavior');

/**
 * Scrape notifications from https://www.linkedin.com/notifications/
 * Normalises each item and upserts to DB. Emits notification:new for genuinely new items.
 *
 * @param {object} opts
 * @param {string} opts.linkedInAccountId
 * @param {string} opts.userId
 * @param {string|null} opts.proxyUrl
 */
async function scrapeNotifications({ linkedInAccountId, userId, proxyUrl = null }) {
  console.log(`[Notifications:${linkedInAccountId}] Scraping notifications...`);

  const { context } = await getAccountContext(linkedInAccountId, userId, proxyUrl);
  const page = await context.newPage();

  try {
    await page.goto('https://www.linkedin.com/notifications/', {
      waitUntil: 'domcontentloaded',
      timeout:   30_000,
    });

    await delay(2000, 3000);

    // Extract notifications from the page
    const items = await page.evaluate(() => {
      const results = [];
      // LinkedIn notifications use various class patterns
      const cards = document.querySelectorAll(
        'article.nt-card, .notification-item, [data-view-name="notification-feed-card"], .nt-notification'
      );

      cards.forEach((card) => {
        // Try to get a unique LinkedIn notification ID from data attributes or URL
        const link      = card.querySelector('a[href]');
        const href      = link?.href || '';
        const timeEl    = card.querySelector('time, .nt-card__time-ago, .t-12');
        const titleEl   = card.querySelector('.nt-card__headline, .notification-text, .t-14.t-black.t-bold, h3');
        const bodyEl    = card.querySelector('.nt-card__body, .notification-text--secondary, .t-14.t-black--light');

        const title = titleEl?.textContent?.trim() || '';
        const body  = bodyEl?.textContent?.trim() || '';
        if (!title) return;

        // Derive a pseudo-unique ID from href (contains notification ID in LinkedIn URLs)
        // e.g. /notifications/?highlight=urn%3Ali%3Anotification%3A...
        const idMatch = href.match(/highlight=([^&]+)/) || href.match(/notification[:\-_]([a-zA-Z0-9]+)/i);
        const linkedinNotifId = idMatch ? decodeURIComponent(idMatch[1]) : `${title.slice(0, 40)}-${Date.now()}`;

        // Detect type from context
        let type = 'other';
        const text = (title + body).toLowerCase();
        if (text.includes('connected') || text.includes('connection'))    type = 'connection';
        else if (text.includes('message'))                                 type = 'message';
        else if (text.includes('liked') || text.includes('reacted'))      type = 'reaction';
        else if (text.includes('commented'))                               type = 'comment';
        else if (text.includes('mentioned') || text.includes('tagged'))   type = 'mention';
        else if (text.includes('followed'))                               type = 'follow';
        else if (text.includes('job') || text.includes('applied'))        type = 'job';

        // Determine receivedAt
        const dateStr = timeEl?.getAttribute('datetime') || new Date().toISOString();
        const receivedAt = new Date(dateStr).toISOString();

        results.push({
          linkedinNotificationId: linkedinNotifId,
          type,
          title,
          body:        body || null,
          linkedinUrl: link ? href.split('?')[0] : null,
          receivedAt,
        });
      });

      return results;
    });

    console.log(`[Notifications:${linkedInAccountId}] Found ${items.length} notifications on page.`);

    const prisma   = getPrisma();
    let newCount   = 0;

    for (const item of items) {
      try {
        // Check if this notification already exists
        const existing = await prisma.notification.findUnique({
          where: { linkedinNotificationId: item.linkedinNotificationId },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              linkedInAccountId,
              linkedinNotificationId: item.linkedinNotificationId,
              type:                   item.type,
              title:                  item.title,
              body:                   item.body || null,
              linkedinUrl:            item.linkedinUrl || null,
              receivedAt:             new Date(item.receivedAt),
            },
          });

          newCount++;

          emitNewNotification(userId, {
            linkedInAccountId,
            notification: {
              type:        item.type,
              title:       item.title,
              body:        item.body,
              linkedinUrl: item.linkedinUrl,
              receivedAt:  item.receivedAt,
            },
          });
        }
      } catch (err) {
        // Catch unique constraint violations gracefully (race conditions)
        if (!err.message?.includes('Unique constraint')) {
          console.error(`[Notifications] Error upserting notification:`, err.message);
        }
      }
    }

    console.log(`[Notifications:${linkedInAccountId}] Done. ${newCount} new notifications emitted.`);
    return { scraped: items.length, newCount };
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { scrapeNotifications };
