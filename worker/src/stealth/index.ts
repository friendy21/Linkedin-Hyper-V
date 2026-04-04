/**
 * Stealth injection system
 * Applies all anti-detection layers to a Playwright page
 */

import type { Page, BrowserContext } from 'rebrowser-playwright';
import type { FingerprintProfile } from '../types/index.js';
import { ERASE_WEBDRIVER_SCRIPT, IFRAME_WEBDRIVER_SCRIPT } from './erase-webdriver.js';
import { buildCanvasNoiseScript } from './canvas-noise.js';
import { buildWebGLSpoofScript } from './webgl-spoof.js';
import { generateFingerprintProfile, validateFingerprintProfile } from './profile-generator.js';

export { generateFingerprintProfile, validateFingerprintProfile };
export * from './launch-args.js';
export * from './human-mouse.js';
export * from './human-typing.js';
export * from './timing.js';

/**
 * Applies all stealth scripts to a browser context
 * This should be called once when creating a new browser context
 * 
 * @param context - Playwright browser context
 * @param profile - Fingerprint profile for the account
 */
export async function applyStealthToContext(
  context: BrowserContext,
  profile: FingerprintProfile
): Promise<void> {
  // Add init scripts that run in all pages
  await context.addInitScript(ERASE_WEBDRIVER_SCRIPT);
  await context.addInitScript(buildCanvasNoiseScript(profile.canvasSeed));
  await context.addInitScript(buildWebGLSpoofScript(profile.webglProfileIndex));
  
  // Set extra HTTP headers
  await context.setExtraHTTPHeaders({
    'Accept-Language': profile.acceptLanguage,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  });
}

/**
 * Applies stealth scripts to a specific page
 * Use this for iframes or dynamically created pages
 * 
 * @param page - Playwright page
 * @param profile - Fingerprint profile for the account
 */
export async function applyStealthToPage(
  page: Page,
  profile: FingerprintProfile
): Promise<void> {
  // Inject scripts into the page
  await page.addInitScript(ERASE_WEBDRIVER_SCRIPT);
  await page.addInitScript(buildCanvasNoiseScript(profile.canvasSeed));
  await page.addInitScript(buildWebGLSpoofScript(profile.webglProfileIndex));
  await page.addInitScript(IFRAME_WEBDRIVER_SCRIPT);
  
  // Override navigator properties
  await page.evaluate((fingerprint) => {
    // Override timezone
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Object.defineProperty(Intl, 'DateTimeFormat', {
      value: function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
        return new originalDateTimeFormat(locales, {
          ...options,
          timeZone: fingerprint.timezone,
        });
      },
      configurable: true,
    });
    
    // Override locale
    Object.defineProperty(navigator, 'language', {
      get: () => fingerprint.locale,
      configurable: true,
    });
    
    Object.defineProperty(navigator, 'languages', {
      get: () => [fingerprint.locale, 'en-US', 'en'],
      configurable: true,
    });
    
    // Override platform
    const platforms = ['Win32', 'Win64', 'MacIntel'];
    Object.defineProperty(navigator, 'platform', {
      get: () => platforms[Math.floor(Math.random() * platforms.length)],
      configurable: true,
    });
    
    // Fix screen dimensions to match viewport
    Object.defineProperty(screen, 'width', {
      get: () => fingerprint.viewport.width,
      configurable: true,
    });
    
    Object.defineProperty(screen, 'height', {
      get: () => fingerprint.viewport.height,
      configurable: true,
    });
    
    Object.defineProperty(screen, 'availWidth', {
      get: () => fingerprint.viewport.width,
      configurable: true,
    });
    
    Object.defineProperty(screen, 'availHeight', {
      get: () => fingerprint.viewport.height - 40, // Account for taskbar
      configurable: true,
    });
    
    Object.defineProperty(screen, 'colorDepth', {
      get: () => 24,
      configurable: true,
    });
    
    Object.defineProperty(screen, 'pixelDepth', {
      get: () => 24,
      configurable: true,
    });
  }, profile);
}

/**
 * Comprehensive stealth test
 * Verifies that anti-detection measures are working
 * 
 * @param page - Playwright page
 * @returns Test results
 */
export async function testStealth(page: Page): Promise<Record<string, boolean>> {
  return await page.evaluate(() => {
    const results: Record<string, boolean> = {};
    
    // Check navigator.webdriver
    results.webdriverUndefined = navigator.webdriver === undefined;
    
    // Check chrome object
    results.chromeObject = typeof window.chrome === 'object' && window.chrome !== null;
    results.chromeRuntime = typeof window.chrome?.runtime === 'object';
    
    // Check permissions
    results.permissionsAPI = typeof navigator.permissions?.query === 'function';
    
    // Check plugins
    results.plugins = navigator.plugins?.length > 0;
    
    // Check notification permission
    try {
      results.notificationPermission = Notification.permission !== undefined;
    } catch {
      results.notificationPermission = false;
    }
    
    // Check for automation globals
    results.noAutomationGlobals = !(
      window.__webdriver_evaluate ||
      window.__selenium_evaluate ||
      window._phantom ||
      window.callPhantom ||
      window.domAutomation
    );
    
    // Check for iFrame webdriver
    try {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeNavigator = iframe.contentWindow?.navigator;
      results.iframeWebdriver = iframeNavigator?.webdriver === undefined;
      document.body.removeChild(iframe);
    } catch {
      results.iframeWebdriver = true;
    }
    
    return results;
  });
}
