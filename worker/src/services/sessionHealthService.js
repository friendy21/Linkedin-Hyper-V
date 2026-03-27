'use strict';

// FILE: worker/src/services/sessionHealthService.js
// Checks if a LinkedIn account's session is still valid.
// On failure: marks status as 'expired' in DB and emits session:expired to the user's socket room.

const { getAccountContext, cleanupContext } = require('../browser');
const { deleteStorageState }                = require('../sessionStorage');
const { getPrisma }                         = require('../db/prisma');
const { emitSessionExpired }                = require('../utils/websocket');
const { delay }                             = require('../humanBehavior');

/**
 * Check session health for one LinkedIn account.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId
 * @param {string|null} proxyUrl
 * @returns {Promise<{ ok: boolean, expired?: boolean }>}
 */
async function checkSessionHealth(linkedInAccountId, userId, proxyUrl = null) {
  console.log(`[SessionHealth] Checking account ${linkedInAccountId}...`);

  let page;
  try {
    const { context } = await getAccountContext(linkedInAccountId, userId, proxyUrl);
    page = await context.newPage();

    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
      timeout:   30_000,
    });

    await delay(1500, 2500);

    const url = page.url();

    if (url.includes('/login') || url.includes('/checkpoint') || url.includes('/authwall')) {
      console.warn(`[SessionHealth] Session expired for account ${linkedInAccountId}`);

      // Mark as expired in DB
      const prisma = getPrisma();
      await prisma.linkedInAccount.update({
        where: { id: linkedInAccountId },
        data:  { status: 'expired' },
      });

      // Notify client
      emitSessionExpired(userId, linkedInAccountId);

      // Pause the queue and drain active jobs to prevent cleanup race condition
      const { getQueue } = require('../queue');
      const queue = getQueue(linkedInAccountId);
      await queue.pause();
      
      let activeJobs = await queue.getJobCounts('active');
      let drainRetries = 0;
      while (activeJobs.active > 0 && drainRetries < 15) {
        console.log(`[SessionHealth] Waiting for ${activeJobs.active} active jobs to finish before eviction...`);
        await delay(2000, 2000);
        activeJobs = await queue.getJobCounts('active');
        drainRetries++;
      }

      // Evict from browser context pool
      await cleanupContext(linkedInAccountId);

      return { ok: false, expired: true };
    }

    // Session still valid — refresh cookies by saving updated storageState
    // (LinkedIn rotates cookies; we grab the fresh ones via context.storageState())
    const { saveStorageState } = require('../sessionStorage');
    const freshState = await context.storageState();
    await saveStorageState(linkedInAccountId, userId, freshState);

    console.log(`[SessionHealth] Account ${linkedInAccountId} is healthy.`);
    return { ok: true };
  } catch (err) {
    console.error(`[SessionHealth] Error checking ${linkedInAccountId}:`, err.message);
    return { ok: false, error: err.message };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

module.exports = { checkSessionHealth };
