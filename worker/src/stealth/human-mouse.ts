/**
 * Human-like mouse movement simulation using Bezier curves
 * Creates realistic cursor paths that mimic human behavior
 */

import type { Page } from 'rebrowser-playwright';

export interface Point {
  x: number;
  y: number;
}

export interface MouseMoveOptions {
  /** Minimum duration in milliseconds */
  minDuration?: number;
  /** Maximum duration in milliseconds */
  maxDuration?: number;
  /** Amount of random jitter to add */
  jitter?: number;
  /** Target area padding (for clicking elements) */
  padding?: number;
}

/**
 * Cubic Bezier curve calculation
 * 
 * @param t - Progress (0 to 1)
 * @param p0 - Start point
 * @param p1 - Control point 1
 * @param p2 - Control point 2
 * @param p3 - End point
 * @returns Point on the curve at t
 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const oneMinusT = 1 - t;
  return (
    Math.pow(oneMinusT, 3) * p0 +
    3 * Math.pow(oneMinusT, 2) * t * p1 +
    3 * oneMinusT * Math.pow(t, 2) * p2 +
    Math.pow(t, 3) * p3
  );
}

/**
 * Generates random control points for a Bezier curve
 * Creates a natural-looking curve between start and target
 * 
 * @param start - Starting point
 * @param target - Target point
 * @returns Control points for the Bezier curve
 */
function generateControlPoints(start: Point, target: Point): { cp1: Point; cp2: Point } {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Random offset magnitude based on distance
  const offsetMag = distance * 0.3;
  
  // Control point 1: roughly 30% of the way with random offset
  const cp1: Point = {
    x: start.x + dx * 0.3 + (Math.random() - 0.5) * offsetMag,
    y: start.y + dy * 0.3 + (Math.random() - 0.5) * offsetMag,
  };
  
  // Control point 2: roughly 70% of the way with different random offset
  const cp2: Point = {
    x: start.x + dx * 0.7 + (Math.random() - 0.5) * offsetMag,
    y: start.y + dy * 0.7 + (Math.random() - 0.5) * offsetMag,
  };
  
  return { cp1, cp2 };
}

/**
 * Simulates human-like mouse movement using Bezier curves
 * 
 * @param page - Playwright page instance
 * @param target - Target coordinates
 * @param options - Movement options
 */
export async function humanMouseMove(
  page: Page,
  target: Point,
  options: MouseMoveOptions = {}
): Promise<void> {
  const {
    minDuration = 200,
    maxDuration = 800,
    jitter = 2,
  } = options;
  
  // Get current mouse position from page
  const start = await page.evaluate(() => {
    return {
      x: (window as unknown as { __mouseX?: number }).__mouseX ?? Math.random() * window.innerWidth,
      y: (window as unknown as { __mouseY?: number }).__mouseY ?? Math.random() * window.innerHeight,
    };
  });
  
  // Calculate distance
  const distance = Math.sqrt(
    Math.pow(target.x - start.x, 2) + 
    Math.pow(target.y - start.y, 2)
  );
  
  // Adjust duration based on distance (humans move faster for short distances)
  const distanceFactor = Math.min(distance / 500, 1);
  const duration = minDuration + (maxDuration - minDuration) * distanceFactor;
  const durationWithVariance = duration * (0.8 + Math.random() * 0.4);
  
  // Generate control points for Bezier curve
  const { cp1, cp2 } = generateControlPoints(start, target);
  
  // Calculate steps (60fps)
  const steps = Math.max(10, Math.ceil(durationWithVariance / 16));
  
  // Movement with ease-in-out
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Apply ease-in-out function for more natural movement
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    // Calculate point on Bezier curve
    const x = cubicBezier(easeT, start.x, cp1.x, cp2.x, target.x);
    const y = cubicBezier(easeT, start.y, cp1.y, cp2.y, target.y);
    
    // Add jitter for realism
    const jitterX = (Math.random() - 0.5) * jitter;
    const jitterY = (Math.random() - 0.5) * jitter;
    
    await page.mouse.move(x + jitterX, y + jitterY);
    
    // Variable delay between movements (slightly faster in middle)
    const progressFactor = 1 - Math.abs(t - 0.5) * 2;
    const delay = 16 + Math.random() * 8 * (1 - progressFactor);
    await page.waitForTimeout(delay);
  }
  
  // Store final position for next movement
  await page.evaluate((pos) => {
    (window as unknown as { __mouseX?: number }).__mouseX = pos.x;
    (window as unknown as { __mouseY?: number }).__mouseY = pos.y;
  }, target);
}

/**
 * Moves mouse to a selector with human-like motion
 * 
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param options - Movement options
 */
export async function humanMoveToElement(
  page: Page,
  selector: string,
  options: MouseMoveOptions = {}
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 10000 });
  
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element ${selector} not found or not visible`);
  }
  
  // Target a random point within the element (not always center)
  const padding = options.padding ?? 5;
  const target: Point = {
    x: box.x + padding + Math.random() * (box.width - padding * 2),
    y: box.y + padding + Math.random() * (box.height - padding * 2),
  };
  
  await humanMouseMove(page, target, options);
}

/**
 * Simulates a human click with realistic timing
 * 
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param options - Movement options
 */
export async function humanClick(
  page: Page,
  selector: string,
  options: MouseMoveOptions = {}
): Promise<void> {
  await humanMoveToElement(page, selector, options);
  
  // Small pause before click (human reaction time)
  await page.waitForTimeout(50 + Math.random() * 100);
  
  // Click with slight randomization
  await page.mouse.down();
  await page.waitForTimeout(80 + Math.random() * 120);
  await page.mouse.up();
}

/**
 * Simulates human-like scrolling
 * 
 * @param page - Playwright page instance
 * @param amount - Scroll amount in pixels (negative for up)
 * @param duration - Duration of scroll in milliseconds
 */
export async function humanScroll(
  page: Page,
  amount: number,
  duration: number = 500
): Promise<void> {
  const steps = Math.ceil(duration / 16);
  const stepAmount = amount / steps;
  
  // Variable scroll speed (slower at start and end)
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const easeFactor = Math.sin(t * Math.PI); // Ease in-out
    const scrollStep = stepAmount * (0.5 + easeFactor * 0.5);
    
    await page.mouse.wheel(0, scrollStep);
    
    // Random pause (humans pause while reading)
    if (Math.random() < 0.1) {
      await page.waitForTimeout(100 + Math.random() * 300);
    } else {
      await page.waitForTimeout(16);
    }
  }
}
