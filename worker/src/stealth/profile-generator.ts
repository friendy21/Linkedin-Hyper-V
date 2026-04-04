/**
 * Fingerprint profile generator
 * Creates unique, consistent browser fingerprints for each account
 */

import type { FingerprintProfile, ViewportDimensions } from '../types/index.js';
import {
  VIEWPORT_DIMENSIONS,
  SYSTEM_FONTS,
  TIMEZONES,
  LOCALES,
} from './launch-args.js';
import { WEBGL_PROFILES } from './webgl-spoof.js';
import { generateCanvasSeed } from './canvas-noise.js';

/**
 * Generates a complete fingerprint profile for a new account
 * This profile should be stored and reused for consistency
 * 
 * @param accountId - Unique account identifier
 * @param preferredTimezone - Optional preferred timezone
 * @returns Complete fingerprint profile
 */
export function generateFingerprintProfile(
  accountId: string,
  preferredTimezone?: string
): FingerprintProfile {
  // Use accountId to seed random choices for consistency
  const seed = hashString(accountId);
  
  // Select viewport
  const viewport = selectViewport(seed);
  
  // Select timezone
  const timezone = preferredTimezone ?? selectTimezone(seed);
  
  // Select locale based on timezone
  const locale = selectLocale(timezone);
  
  // Select WebGL profile
  const webglProfileIndex = seededRandomInt(seed, 0, WEBGL_PROFILES.length - 1);
  
  // Generate canvas seed
  const canvasSeed = generateCanvasSeed();
  
  // Select font subset (15-25 fonts for variety)
  const numFonts = seededRandomInt(seed, 15, 25);
  const fonts = selectRandomFonts(seed, numFonts);
  
  // Generate user agent based on viewport
  const userAgent = generateUserAgent(viewport);
  
  return {
    canvasSeed,
    webglProfileIndex,
    viewport,
    timezone,
    locale: locale.locale,
    acceptLanguage: locale.acceptLanguage,
    userAgent,
    fonts,
  };
}

/**
 * Simple string hash for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Seeded random integer generator
 */
function seededRandomInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed++) * 10000;
  return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
}

/**
 * Select viewport dimensions
 */
function selectViewport(seed: number): ViewportDimensions {
  const index = seededRandomInt(seed, 0, VIEWPORT_DIMENSIONS.length - 1);
  return VIEWPORT_DIMENSIONS[index];
}

/**
 * Select timezone
 */
function selectTimezone(seed: number): string {
  const index = seededRandomInt(seed, 0, TIMEZONES.length - 1);
  return TIMEZONES[index];
}

/**
 * Select locale based on timezone
 */
function selectLocale(timezone: string): { locale: string; acceptLanguage: string } {
  // Map common timezones to appropriate locales
  if (timezone.startsWith('America/')) {
    return LOCALES[0]; // en-US
  } else if (timezone.startsWith('Europe/')) {
    return LOCALES[1]; // en-GB
  } else if (timezone.startsWith('Australia/')) {
    return LOCALES[3]; // en-AU
  } else {
    return LOCALES[Math.floor(Math.random() * LOCALES.length)];
  }
}

/**
 * Select a random subset of fonts
 */
function selectRandomFonts(seed: number, count: number): string[] {
  const shuffled = [...SYSTEM_FONTS].sort(() => {
    seed++;
    return Math.sin(seed) * 10000 % 1 - 0.5;
  });
  return shuffled.slice(0, count);
}

/**
 * Generate a realistic user agent
 */
function generateUserAgent(viewport: ViewportDimensions): string {
  // Chrome on Windows 10/11 is most common
  const chromeVersion = 120 + Math.floor(Math.random() * 10);
  
  if (viewport.width >= 1920) {
    // Desktop
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  } else if (viewport.width >= 1366) {
    // Laptop
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  } else {
    // Smaller screen
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  }
}

/**
 * Validates that a fingerprint profile has all required fields
 */
export function validateFingerprintProfile(profile: Partial<FingerprintProfile>): profile is FingerprintProfile {
  return !!(
    profile.canvasSeed !== undefined &&
    profile.webglProfileIndex !== undefined &&
    profile.viewport?.width !== undefined &&
    profile.viewport?.height !== undefined &&
    profile.timezone !== undefined &&
    profile.locale !== undefined &&
    profile.acceptLanguage !== undefined &&
    profile.userAgent !== undefined &&
    Array.isArray(profile.fonts) &&
    profile.fonts.length > 0
  );
}
