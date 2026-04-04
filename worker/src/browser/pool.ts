/**
 * Browser pool manager
 * Manages Chrome browser contexts with per-account isolation
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'rebrowser-playwright';
import type { Account, Proxy, BrowserSession, FingerprintProfile } from '../types/index.js';
import { 
  STEALTH_CHROME_ARGS, 
  applyStealthToContext,
  generateFingerprintProfile,
  validateFingerprintProfile,
} from '../stealth/index.js';
import { EventEmitter } from 'events';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import logger from '../utils/logger.js';

export interface BrowserPoolConfig {
  /** Maximum number of concurrent browsers */
  maxBrowsers: number;
  /** Base display number for Xvfb (99, 100, 101...) */
  baseDisplay: number;
  /** Path to store browser profiles */
  profilePath: string;
  /** Default timeout for browser operations */
  defaultTimeout: number;
  /** Browser TTL in ms before forced restart */
  browserTtl: number;
}

export interface PooledBrowser {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  accountId: string;
  display: number;
  launchedAt: Date;
  lastActivityAt: Date;
  proxy?: Proxy;
}

/**
 * Browser pool manager with per-account isolation
 * Ensures each account has its own browser context with unique fingerprint
 */
export class BrowserPool extends EventEmitter {
  private browsers: Map<string, PooledBrowser> = new Map();
  private config: BrowserPoolConfig;
  private displayCounter: number = 0;
  private shutdownHandlers: Array<() => Promise<void>> = [];

  constructor(config: Partial<BrowserPoolConfig> = {}) {
    super();
    this.config = {
      maxBrowsers: config.maxBrowsers ?? 5,
      baseDisplay: config.baseDisplay ?? 99,
      profilePath: config.profilePath ?? '/app/profiles',
      defaultTimeout: config.defaultTimeout ?? 30000,
      browserTtl: config.browserTtl ?? 30 * 60 * 1000, // 30 minutes
    };
    
    // Setup graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Gets or creates a browser for an account
   * Each account gets its own isolated browser context
   * 
   * @param account - Account configuration
   * @returns Pooled browser instance
   */
  async getBrowser(account: Account): Promise<PooledBrowser> {
    // Check if browser already exists for this account
    const existing = this.browsers.get(account.id);
    if (existing) {
      // Check if browser is still valid
      const age = Date.now() - existing.launchedAt.getTime();
      if (age < this.config.browserTtl) {
        existing.lastActivityAt = new Date();
        logger.debug(`Reusing existing browser for account ${account.id}`);
        return existing;
      }
      
      // Browser expired, close it
      logger.info(`Browser TTL expired for account ${account.id}, restarting`);
      await this.closeBrowser(account.id);
    }

    // Check pool limit
    if (this.browsers.size >= this.config.maxBrowsers) {
      // Close oldest inactive browser
      await this.closeOldestBrowser();
    }

    // Launch new browser
    return await this.launchBrowser(account);
  }

  /**
   * Launches a new browser for an account
   * 
   * @param account - Account configuration
   * @returns New pooled browser instance
   */
  private async launchBrowser(account: Account): Promise<PooledBrowser> {
    const display = this.config.baseDisplay + this.displayCounter++;
    
    logger.info(`Launching browser for account ${account.id} on display :${display}`);

    // Ensure profile directory exists
    const userDataDir = join(this.config.profilePath, account.id);
    await mkdir(userDataDir, { recursive: true });

    // Get or generate fingerprint
    let fingerprint: FingerprintProfile;
    if (validateFingerprintProfile(account.fingerprint)) {
      fingerprint = account.fingerprint;
    } else {
      fingerprint = generateFingerprintProfile(account.id);
      logger.info(`Generated new fingerprint for account ${account.id}`);
    }

    // Build launch args
    const launchArgs = [
      ...STEALTH_CHROME_ARGS,
      `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`,
      `--user-data-dir=${userDataDir}`,
    ];

    // Add proxy if configured
    let proxyServer: string | undefined;
    if (account.proxyId) {
      // Proxy would be fetched from database
      // For now, we'll handle it in the context
    }

    // Launch browser
    const browser = await chromium.launch({
      headless: false,
      args: launchArgs,
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      timeout: this.config.defaultTimeout,
    });

    // Create context with fingerprint
    const context = await browser.newContext({
      viewport: {
        width: fingerprint.viewport.width,
        height: fingerprint.viewport.height,
      },
      userAgent: fingerprint.userAgent,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezone,
      proxy: account.proxyId ? {
        server: 'http://proxy:8080', // Would be actual proxy URL
      } : undefined,
    });

    // Apply stealth scripts
    await applyStealthToContext(context, fingerprint);

    // Create initial page
    const page = await context.newPage();
    await page.setDefaultTimeout(this.config.defaultTimeout);
    await page.setDefaultNavigationTimeout(this.config.defaultTimeout);

    const pooledBrowser: PooledBrowser = {
      browser,
      context,
      page,
      accountId: account.id,
      display,
      launchedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.browsers.set(account.id, pooledBrowser);
    this.emit('browser:launched', { accountId: account.id, display });

    logger.info(`Browser launched for account ${account.id}`);
    return pooledBrowser;
  }

  /**
   * Closes a browser for a specific account
   * 
   * @param accountId - Account ID
   */
  async closeBrowser(accountId: string): Promise<void> {
    const pooled = this.browsers.get(accountId);
    if (!pooled) return;

    logger.info(`Closing browser for account ${accountId}`);

    try {
      await pooled.context.close();
      await pooled.browser.close();
    } catch (error) {
      logger.error(`Error closing browser for ${accountId}:`, error);
    }

    this.browsers.delete(accountId);
    this.emit('browser:closed', { accountId });
  }

  /**
   * Closes the oldest inactive browser when pool is full
   */
  private async closeOldestBrowser(): Promise<void> {
    let oldest: PooledBrowser | null = null;
    let oldestTime = Infinity;

    for (const [accountId, pooled] of this.browsers) {
      const inactiveTime = Date.now() - pooled.lastActivityAt.getTime();
      if (inactiveTime > oldestTime) {
        oldest = pooled;
        oldestTime = inactiveTime;
      }
    }

    if (oldest) {
      await this.closeBrowser(oldest.accountId);
    }
  }

  /**
   * Gets a page for an account, creating browser if needed
   * 
   * @param account - Account configuration
   * @returns Playwright page
   */
  async getPage(account: Account): Promise<Page> {
    const pooled = await this.getBrowser(account);
    return pooled.page;
  }

  /**
   * Creates a new page in an existing browser context
   * 
   * @param accountId - Account ID
   * @returns New page or null if browser doesn't exist
   */
  async newPage(accountId: string): Promise<Page | null> {
    const pooled = this.browsers.get(accountId);
    if (!pooled) return null;

    const page = await pooled.context.newPage();
    pooled.lastActivityAt = new Date();
    return page;
  }

  /**
   * Gets all active browser sessions
   */
  getActiveSessions(): BrowserSession[] {
    return Array.from(this.browsers.values()).map(pooled => ({
      accountId: pooled.accountId,
      contextId: pooled.context.toString(),
      display: pooled.display,
      proxy: pooled.proxy,
      launchedAt: pooled.launchedAt,
      lastActivityAt: pooled.lastActivityAt,
    }));
  }

  /**
   * Checks if a browser is active for an account
   */
  hasBrowser(accountId: string): boolean {
    return this.browsers.has(accountId);
  }

  /**
   * Gets pool statistics
   */
  getStats(): { active: number; max: number; displayRange: string } {
    const displays = Array.from(this.browsers.values()).map(b => b.display);
    return {
      active: this.browsers.size,
      max: this.config.maxBrowsers,
      displayRange: displays.length > 0 
        ? `:${Math.min(...displays)} - :${Math.max(...displays)}` 
        : 'none',
    };
  }

  /**
   * Closes all browsers gracefully
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all browsers...');
    
    const closePromises = Array.from(this.browsers.keys()).map(id => 
      this.closeBrowser(id)
    );
    
    await Promise.all(closePromises);
    this.browsers.clear();
    
    logger.info('All browsers closed');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await this.closeAll();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('exit', () => {
      logger.info('Process exiting');
    });
  }
}

// Singleton instance
let globalPool: BrowserPool | null = null;

export function getBrowserPool(config?: Partial<BrowserPoolConfig>): BrowserPool {
  if (!globalPool) {
    globalPool = new BrowserPool(config);
  }
  return globalPool;
}

export function resetBrowserPool(): void {
  globalPool = null;
}
