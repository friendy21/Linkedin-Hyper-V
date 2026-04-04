// FILE: worker/src/humanBehavior.js
'use strict';

const { sanitizeText } = require('./sanitizers');

/** Random integer between min and max inclusive */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Random delay */
function delay(minMs, maxMs) {
  return new Promise((r) => setTimeout(r, randInt(minMs, maxMs)));
}

/**
 * Move mouse along a quadratic Bezier curve for natural trajectory.
 */
async function bezierMove(page, x1, y1, x2, y2, steps = 20) {
  const cpX = (x1 + x2) / 2 + randInt(-60, 60);
  const cpY = (y1 + y2) / 2 + randInt(-40, 40);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(
      (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpX + t * t * x2,
      (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpY + t * t * y2
    );
    await delay(8, 22);
  }
}

/**
 * Click an element with Bezier mouse trajectory and optional pre-click hesitation.
 */
async function humanClick(page, selector, options = {}) {
  const timeout = options.timeout || 15000;
  const el  = await page.waitForSelector(selector, { timeout, state: 'visible' });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const box = await el.boundingBox();
  if (!box) throw new Error(`Element not visible: ${selector}`);

  // Random landing point inside the element
  const x = box.x + box.width  * (0.25 + Math.random() * 0.5);
  const y = box.y + box.height * (0.25 + Math.random() * 0.5);

  // Bezier approach from a nearby random offset
  await bezierMove(
    page,
    x + randInt(-80, 80),
    y + randInt(-40, 40),
    x,
    y
  );
  await delay(60, 180);

  // Pre-click hesitation (25% chance)
  if (Math.random() < 0.25) await delay(100, 400);

  await page.mouse.click(x, y);
}

/**
 * Type text with human-like variable speed.
 */
async function humanType(page, selector, text, options = {}) {
  await humanClick(page, selector, options);
  await delay(150, 350);

  const saneText = sanitizeText(text, { maxLength: 3000 });

  for (const char of saneText) {
    await page.keyboard.type(char, { delay: randInt(25, 65) });
    if (Math.random() < 0.03) await delay(200, 500);
  }
}

/**
 * Scroll the page naturally in small increments.
 */
async function humanScroll(page, totalPx) {
  const steps = randInt(6, 14);
  const chunk = totalPx / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, chunk + randInt(-20, 20));
    await delay(25, 70);
  }
}

/**
 * Scroll an element into view, with a small jitter afterward to simulate reading.
 */
async function humanScrollToElement(page, selector) {
  const el = await page.$(selector);
  if (!el) return;
  await el.scrollIntoViewIfNeeded();
  await delay(200, 500);
  await humanScroll(page, randInt(-30, 30));
}

module.exports = { delay, randInt, humanClick, humanType, humanScroll, bezierMove, humanScrollToElement };
