'use strict';

// FILE: worker/src/services/connectionDeltaService.js
// Scrapes LinkedIn connections and persists them to the Connection table.
// Uses a count-first delta strategy: only do a full scrape if the count changed.

const { getAccountContext }     = require('../browser');
const { getPrisma }             = require('../db/prisma');
const { emitNewConnection }     = require('../utils/websocket');
const { delay }                 = require('../humanBehavior');
const crypto                    = require('crypto');

/**
 * Scrape the full connections list from LinkedIn and upsert to DB.
 *
 * @param {object} page          - Playwright page (already authenticated)
 * @param {string} linkedInAccountId
 * @returns {Promise<{ count: number, connections: object[] }>}
 */
async function scrapeConnectionsList(page, linkedInAccountId) {
  console.log(`[Connections:${linkedInAccountId}] Scraping connections list...`);

  await page.goto('https://www.linkedin.com/mynetwork/invite-connect/connections/', {
    waitUntil: 'domcontentloaded',
    timeout:   30_000,
  });

  await delay(2000, 3000);

  // Scroll to load all connections (LinkedIn lazy-loads)
  let previousHeight = 0;
  for (let i = 0; i < 20; i++) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (height === previousHeight) break;
    previousHeight = height;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1000, 1500);
  }

  // Extract connection cards
  const connections = await page.evaluate(() => {
    const items = [];
    // LinkedIn connection list item selectors may vary — match common patterns
    const cards = document.querySelectorAll(
      'li.mn-connection-card, .mn-connections__card, [data-view-name="member-connections-card"]'
    );

    cards.forEach((card) => {
      const profileUrl = card.querySelector('a[href*="/in/"]')?.href || '';
      const name       = card.querySelector('.mn-connection-card__name, .actor-name, .t-bold')?.textContent?.trim() || '';
      const headline   = card.querySelector('.mn-connection-card__occupation, .t-14')?.textContent?.trim() || '';
      const profileId  = profileUrl.match(/\/in\/([^/?]+)/)?.[1] || '';

      if (profileId && name) {
        items.push({ profileId, name, profileUrl: profileUrl.split('?')[0], headline });
      }
    });

    return items;
  });

  console.log(`[Connections:${linkedInAccountId}] Found ${connections.length} connections via DOM scrape.`);
  return connections;
}

/**
 * Get the current connection count from LinkedIn.
 * Uses the network count displayed on the "My Network" page.
 *
 * @param {object} page
 * @returns {Promise<number|null>}
 */
async function scrapeConnectionCount(page) {
  try {
    await page.goto('https://www.linkedin.com/mynetwork/', {
      waitUntil: 'domcontentloaded',
      timeout:   30_000,
    });
    await delay(1500, 2000);

    const count = await page.evaluate(() => {
      // Try various selectors LinkedIn uses for connection count
      const selectors = [
        '.t-16.t-black.t-bold',
        '[data-view-name="connection-count"]',
        '.mn-connections__header span',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent.trim().replace(/,/g, '');
          const num  = parseInt(text, 10);
          if (!isNaN(num)) return num;
        }
      }
      return null;
    });

    return count;
  } catch {
    return null;
  }
}

/**
 * Full first-time connection scrape.
 * Scrapes all connections and stores them in the DB.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId
 * @param {string|null} proxyUrl
 */
async function scrapeAllConnections(linkedInAccountId, userId, proxyUrl = null) {
  console.log(`[Connections:${linkedInAccountId}] Starting full connection scrape...`);

  const { context } = await getAccountContext(linkedInAccountId, userId, proxyUrl);
  const page = await context.newPage();

  try {
    const connections = await scrapeConnectionsList(page, linkedInAccountId);
    if (connections.length === 0) return { inserted: 0 };

    const prisma  = getPrisma();
    const hash    = crypto.createHash('sha256').update(JSON.stringify(connections.map((c) => c.profileId).sort())).digest('hex');
    let inserted  = 0;

    for (const conn of connections) {
      try {
        await prisma.connection.upsert({
          where: {
            linkedInAccountId_linkedinProfileId: {
              linkedInAccountId,
              linkedinProfileId: conn.profileId,
            },
          },
          create: {
            linkedInAccountId,
            linkedinProfileId:      conn.profileId,
            name:                   conn.name,
            profileUrl:             conn.profileUrl || null,
            headline:               conn.headline || null,
            connectionCountSnapshot: connections.length,
            snapshotHash:           hash,
          },
          update: {
            name:                   conn.name,
            profileUrl:             conn.profileUrl || null,
            headline:               conn.headline || null,
            connectionCountSnapshot: connections.length,
            snapshotHash:           hash,
          },
        });
        inserted++;
      } catch (err) {
        console.error(`[Connections] Upsert error for ${conn.profileId}:`, err.message);
      }
    }

    console.log(`[Connections:${linkedInAccountId}] Upserted ${inserted} connections.`);
    return { inserted };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Delta check: fetch count, compare to snapshot, do full scrape only if changed.
 * Emit connection:new for any genuinely new connections.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId
 * @param {string|null} proxyUrl
 */
async function runConnectionDelta(linkedInAccountId, userId, proxyUrl = null) {
  console.log(`[Connections:${linkedInAccountId}] Running delta check...`);

  const prisma = getPrisma();
  const { context } = await getAccountContext(linkedInAccountId, userId, proxyUrl);
  const page = await context.newPage();

  try {
    // Step 1: Get current count (lightweight request)
    const currentCount = await scrapeConnectionCount(page);

    if (currentCount === null) {
      console.warn(`[Connections:${linkedInAccountId}] Could not read connection count — skipping delta.`);
      return;
    }

    // Get the stored snapshot count
    const snapshot = await prisma.connection.findFirst({
      where:   { linkedInAccountId },
      orderBy: { createdAt: 'desc' },
      select:  { connectionCountSnapshot: true },
    });

    const storedCount = snapshot?.connectionCountSnapshot ?? -1;

    if (currentCount === storedCount) {
      console.log(`[Connections:${linkedInAccountId}] Count unchanged (${currentCount}) — no delta needed.`);
      return;
    }

    console.log(`[Connections:${linkedInAccountId}] Count changed: ${storedCount} → ${currentCount}. Running full scrape.`);

    // Step 2: Full scrape
    const connections = await scrapeConnectionsList(page, linkedInAccountId);
    if (connections.length === 0) return;

    // Step 3: Compare against DB to find truly new connections
    const existingIds = new Set(
      (await prisma.connection.findMany({
        where:  { linkedInAccountId },
        select: { linkedinProfileId: true },
      })).map((c) => c.linkedinProfileId)
    );

    const newConnections = connections.filter((c) => !existingIds.has(c.profileId));

    const hash = crypto.createHash('sha256').update(JSON.stringify(connections.map((c) => c.profileId).sort())).digest('hex');

    // Step 4: Upsert all, emit events for new ones
    for (const conn of connections) {
      await prisma.connection.upsert({
        where: {
          linkedInAccountId_linkedinProfileId: {
            linkedInAccountId,
            linkedinProfileId: conn.profileId,
          },
        },
        create: {
          linkedInAccountId,
          linkedinProfileId:       conn.profileId,
          name:                    conn.name,
          profileUrl:              conn.profileUrl || null,
          headline:                conn.headline || null,
          connectionCountSnapshot: currentCount,
          snapshotHash:            hash,
        },
        update: {
          name:                    conn.name,
          profileUrl:              conn.profileUrl || null,
          headline:                conn.headline || null,
          connectionCountSnapshot: currentCount,
          snapshotHash:            hash,
        },
      }).catch((err) => console.error(`[Connections] Upsert error:`, err.message));
    }

    // Emit events for new connections only
    for (const conn of newConnections) {
      emitNewConnection(userId, {
        linkedInAccountId,
        connection: {
          profileId:  conn.profileId,
          name:       conn.name,
          profileUrl: conn.profileUrl,
          headline:   conn.headline,
        },
      });
    }

    console.log(`[Connections:${linkedInAccountId}] Delta complete. New: ${newConnections.length}, Total: ${connections.length}`);
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { scrapeAllConnections, runConnectionDelta };
