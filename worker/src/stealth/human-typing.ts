/**
 * Human typing simulation with realistic delays and occasional typos
 */

import type { Page } from 'rebrowser-playwright';

export interface TypingOptions {
  /** Base delay between keystrokes in ms */
  baseDelay?: number;
  /** Variance in delay (0-1) */
  delayVariance?: number;
  /** Probability of making a typo (0-1) */
  typoRate?: number;
  /** Probability of pausing to "think" (0-1) */
  thinkPauseRate?: number;
  /** Whether to clear field before typing */
  clearFirst?: boolean;
}

/**
 * Common typing mistakes based on keyboard layout
 */
const TYPO_MAP: Record<string, string[]> = {
  'a': ['s', 'q', 'z'],
  'b': ['v', 'n', 'g'],
  'c': ['x', 'v', 'f'],
  'd': ['s', 'f', 'e', 'c'],
  'e': ['w', 'r', 'd', 's'],
  'f': ['d', 'g', 'r', 'v'],
  'g': ['f', 'h', 't', 'b'],
  'h': ['g', 'j', 'y', 'n'],
  'i': ['u', 'o', 'k'],
  'j': ['h', 'k', 'u', 'm'],
  'k': ['j', 'l', 'i', ','],
  'l': ['k', ';', 'o', '.'],
  'm': ['n', ',', 'j'],
  'n': ['b', 'm', 'h'],
  'o': ['i', 'p', 'l'],
  'p': ['o', '[', ';'],
  'q': ['w', 'a', '1'],
  'r': ['e', 't', 'f'],
  's': ['a', 'd', 'w', 'x'],
  't': ['r', 'y', 'g'],
  'u': ['y', 'i', 'h'],
  'v': ['c', 'b', 'f'],
  'w': ['q', 'e', 's'],
  'x': ['z', 'c', 's'],
  'y': ['t', 'u', 'h'],
  'z': ['a', 'x', 's'],
};

/**
 * Generates a typo for a character based on keyboard proximity
 * 
 * @param char - The character to mistype
 * @returns A similar character or the original if no typo possible
 */
function generateTypo(char: string): string {
  const lowerChar = char.toLowerCase();
  const possibleTypos = TYPO_MAP[lowerChar];
  
  if (!possibleTypos || possibleTypos.length === 0) {
    return char;
  }
  
  const typo = possibleTypos[Math.floor(Math.random() * possibleTypos.length)];
  
  // Preserve case
  return char === char.toUpperCase() ? typo.toUpperCase() : typo;
}

/**
 * Calculates delay for a keystroke based on character
 * Some characters take longer (shift combinations, etc.)
 * 
 * @param char - The character being typed
 * @param baseDelay - Base delay in ms
 * @param variance - Variance factor (0-1)
 * @returns Delay in milliseconds
 */
function calculateKeystrokeDelay(char: string, baseDelay: number, variance: number): number {
  let delay = baseDelay;
  
  // Uppercase takes longer (requires shift)
  if (char === char.toUpperCase() && char !== char.toLowerCase()) {
    delay *= 1.3;
  }
  
  // Punctuation can be slower
  if (!/[a-zA-Z0-9\s]/.test(char)) {
    delay *= 1.2;
  }
  
  // Add variance
  const varianceAmount = delay * variance;
  delay += (Math.random() - 0.5) * 2 * varianceAmount;
  
  // Ensure minimum delay
  return Math.max(20, delay);
}

/**
 * Simulates human typing with realistic delays and occasional typos
 * 
 * @param page - Playwright page instance
 * @param selector - Input element selector
 * @param text - Text to type
 * @param options - Typing options
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: TypingOptions = {}
): Promise<void> {
  const {
    baseDelay = 80,
    delayVariance = 0.4,
    typoRate = 0.03,
    thinkPauseRate = 0.05,
    clearFirst = true,
  } = options;
  
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 10000 });
  
  // Click to focus
  await element.click();
  
  // Clear field if requested
  if (clearFirst) {
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(50);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(50);
  }
  
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    
    // Occasionally make a typo
    if (Math.random() < typoRate && /[a-zA-Z]/.test(char)) {
      // Type wrong character
      const typo = generateTypo(char);
      await page.keyboard.type(typo, { delay: 0 });
      
      // Realize mistake (short pause)
      await page.waitForTimeout(100 + Math.random() * 200);
      
      // Backspace to delete
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(50 + Math.random() * 100);
      
      // Type correct character
      await page.keyboard.type(char, { delay: 0 });
    } else {
      // Type normally
      const delay = calculateKeystrokeDelay(char, baseDelay, delayVariance);
      await page.keyboard.type(char, { delay });
    }
    
    // Occasionally pause to "think"
    if (Math.random() < thinkPauseRate) {
      const pauseDuration = 300 + Math.random() * 700;
      await page.waitForTimeout(pauseDuration);
    }
    
    i++;
  }
  
  // Small pause after typing
  await page.waitForTimeout(100 + Math.random() * 200);
}

/**
 * Types text quickly (for less sensitive fields like search)
 * 
 * @param page - Playwright page instance
 * @param selector - Input element selector
 * @param text - Text to type
 * @param options - Typing options
 */
export async function quickType(
  page: Page,
  selector: string,
  text: string,
  options: Omit<TypingOptions, 'typoRate' | 'thinkPauseRate'> = {}
): Promise<void> {
  await humanType(page, selector, text, {
    ...options,
    baseDelay: options.baseDelay ?? 40,
    delayVariance: options.delayVariance ?? 0.2,
    typoRate: 0,
    thinkPauseRate: 0.01,
  });
}

/**
 * Types text with careful precision (for sensitive fields)
 * 
 * @param page - Playwright page instance
 * @param selector - Input element selector
 * @param text - Text to type
 * @param options - Typing options
 */
export async function carefulType(
  page: Page,
  selector: string,
  text: string,
  options: Omit<TypingOptions, 'typoRate'> = {}
): Promise<void> {
  await humanType(page, selector, text, {
    ...options,
    baseDelay: options.baseDelay ?? 120,
    delayVariance: options.delayVariance ?? 0.3,
    typoRate: 0.02,
    thinkPauseRate: 0.08,
  });
}
