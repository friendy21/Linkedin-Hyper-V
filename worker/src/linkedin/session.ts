/**
 * LinkedIn Session Manager
 * Handles cookie storage, session validation, and automatic re-login
 */

import type { BrowserContext, Page } from 'rebrowser-playwright';
import type { LinkedInAccount } from '../types/index.js';
import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import logger from '../utils/logger.js';
import { actionDelay } from '../stealth/timing.js';
import { humanType } from '../stealth/human-typing.js';
import { humanClick } from '../stealth/human-mouse.js';

export type SessionStatus = 
  | { state: 'active' }
  | { state: 'expired'; canRelogin: boolean }
  | { state: 'captcha'; url: string }
  | { state: 'twofa'; method: 'sms' | 'email' | 'app' }
  | { state: 'no_credentials' }
  | { state: 'error'; message: string };

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface Credentials {
  email: string;
  password: string;
}

/**
 * Encrypts credentials using AES-256-GCM
 */
function encryptCredentials(plaintext: string, encryptionKey: string): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(encryptionKey.padEnd(32).slice(0, 32)), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

/**
 * Decrypts credentials using AES-256-GCM
 */
function decryptCredentials(encrypted: string, iv: string, authTag: string, encryptionKey: string): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey.padEnd(32).slice(0, 32)),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * LinkedIn Session Manager
 */
export class LinkedInSessionManager {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.SESSION_ENCRYPTION_KEY || '';
    if (!this.encryptionKey || this.encryptionKey.length < 16) {
      throw new Error('SESSION_ENCRYPTION_KEY must be set and at least 16 characters');
    }
  }

  /**
   * Ensures a valid session exists for an account
   * Attempts automatic re-login if session is expired
   * 
   * @param account - LinkedIn account configuration
   * @param context - Playwright browser context
   * @returns Session status
   */
  async ensureSession(
    account: LinkedInAccount,
    context: BrowserContext
  ): Promise<SessionStatus> {
    logger.info(`Ensuring session for account ${account.id}`);

    // Try to load existing cookies
    if (account.encryptedCookies) {
      try {
        const cookies = this.decryptCookies(account.encryptedCookies);
        await context.addCookies(cookies);
        
        // Verify session is valid
        const isValid = await this.verifySession(context);
        if (isValid) {
          logger.info(`Existing session valid for account ${account.id}`);
          return { state: 'active' };
        }
        
        logger.info(`Session expired for account ${account.id}`);
      } catch (error) {
        logger.error(`Failed to load cookies for ${account.id}:`, error);
      }
    }

    // Check if we have credentials for re-login
    if (!account.credentialsIv || !account.credentialsAuthTag) {
      logger.warn(`No credentials stored for account ${account.id}`);
      return { state: 'no_credentials' };
    }

    // Attempt re-login
    return await this.performLogin(account, context);
  }

  /**
   * Verifies if current session is valid
   * 
   * @param context - Browser context with cookies
   * @returns Whether session is valid
   */
  private async verifySession(context: BrowserContext): Promise<boolean> {
    const page = await context.newPage();
    try {
      await page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      
      const url = page.url();
      const isValid = url.includes('/feed/') || url.includes('/mynetwork/');
      
      if (!isValid) {
        logger.debug(`Session validation failed, redirected to: ${url}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Session verification error:', error);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Performs login with stored credentials
   * 
   * @param account - LinkedIn account with credentials
   * @param context - Browser context
   * @returns Session status after login attempt
   */
  private async performLogin(
    account: LinkedInAccount,
    context: BrowserContext
  ): Promise<SessionStatus> {
    logger.info(`Attempting login for account ${account.id}`);

    let credentials: Credentials;
    try {
      credentials = this.getCredentials(account);
    } catch (error) {
      logger.error(`Failed to decrypt credentials for ${account.id}:`, error);
      return { state: 'no_credentials' };
    }

    const page = await context.newPage();
    
    try {
      // Navigate to login page
      await page.goto('https://www.linkedin.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await actionDelay('navigation');

      // Check for CAPTCHA
      const hasCaptcha = await this.detectCaptcha(page);
      if (hasCaptcha) {
        logger.warn(`CAPTCHA detected during login for ${account.id}`);
        return { state: 'captcha', url: page.url() };
      }

      // Fill login form
      await humanType(page, '#username', credentials.email, { typoRate: 0.02 });
      await actionDelay('typing');
      
      await humanType(page, '#password', credentials.password, { typoRate: 0.01 });
      await actionDelay('typing');

      // Click login button
      await humanClick(page, 'button[type="submit"]');

      // Wait for navigation
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Check for 2FA
      const twoFaStatus = await this.detect2FA(page);
      if (twoFaStatus) {
        logger.warn(`2FA required for ${account.id}: ${twoFaStatus.method}`);
        return twoFaStatus;
      }

      // Check for CAPTCHA again
      const captchaAfterLogin = await this.detectCaptcha(page);
      if (captchaAfterLogin) {
        logger.warn(`CAPTCHA after login for ${account.id}`);
        return { state: 'captcha', url: page.url() };
      }

      // Verify successful login
      const url = page.url();
      if (url.includes('/feed/') || url.includes('/mynetwork/') || url.includes('/checkpoint/')) {
        // Save cookies
        await this.saveCookies(account.id, context);
        logger.info(`Login successful for ${account.id}`);
        return { state: 'active' };
      }

      // Check if still on login page (invalid credentials)
      if (url.includes('/login')) {
        const errorElement = await page.$('.alert-content, .form__error');
        const errorText = errorElement ? await errorElement.textContent() : 'Unknown error';
        logger.error(`Login failed for ${account.id}: ${errorText}`);
        return { state: 'error', message: errorText || 'Invalid credentials' };
      }

      return { state: 'error', message: `Unexpected redirect to ${url}` };
    } catch (error) {
      logger.error(`Login error for ${account.id}:`, error);
      return { state: 'error', message: String(error) };
    } finally {
      await page.close();
    }
  }

  /**
   * Detects if a CAPTCHA challenge is present
   * 
   * @param page - Playwright page
   * @returns Whether CAPTCHA was detected
   */
  private async detectCaptcha(page: Page): Promise<boolean> {
    const captchaSelectors = [
      '[data-test="checkpoint-challenge"]',
      '#captcha-internal',
      '.captcha-container',
      'iframe[src*="captcha"]',
      'iframe[src*="checkpoint"]',
      '.challenge',
      '[id*="captcha"]',
      '.recaptcha',
      '.hcaptcha',
    ];

    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) {
        logger.debug(`CAPTCHA detected via selector: ${selector}`);
        return true;
      }
    }

    // Check URL for challenge patterns
    const url = page.url();
    if (url.includes('checkpoint') || url.includes('challenge')) {
      return true;
    }

    return false;
  }

  /**
   * Detects if 2FA is required
   * 
   * @param page - Playwright page
   * @returns 2FA status or null if not required
   */
  private async detect2FA(page: Page): Promise<SessionStatus | null> {
    const url = page.url();
    
    if (!url.includes('checkpoint') && !url.includes('two-step')) {
      return null;
    }

    // Check for SMS input
    const hasSmsInput = await page.$('#input__phone_verification_pin, [name="pin"]').then(Boolean);
    if (hasSmsInput) {
      return { state: 'twofa', method: 'sms' };
    }

    // Check for email verification
    const hasEmailOption = await page.$('[data-test="email-pin-challenge"]').then(Boolean);
    if (hasEmailOption) {
      return { state: 'twofa', method: 'email' };
    }

    // Check for authenticator app
    const hasAppOption = await page.$('[data-test="authenticator-app-challenge"]').then(Boolean);
    if (hasAppOption) {
      return { state: 'twofa', method: 'app' };
    }

    return null;
  }

  /**
   * Extracts and decrypts credentials
   * 
   * @param account - LinkedIn account
   * @returns Decrypted credentials
   */
  private getCredentials(account: LinkedInAccount): Credentials {
    if (!account.credentialsIv || !account.credentialsAuthTag) {
      throw new Error('Missing credential encryption data');
    }

    const decrypted = decryptCredentials(
      account.email,
      account.credentialsIv,
      account.credentialsAuthTag,
      this.encryptionKey
    );

    const [email, password] = decrypted.split(':');
    if (!email || !password) {
      throw new Error('Invalid credential format');
    }

    return { email, password };
  }

  /**
   * Stores credentials securely
   * 
   * @param accountId - Account ID
   * @param email - LinkedIn email
   * @param password - LinkedIn password
   * @returns Encrypted credential data
   */
  storeCredentials(accountId: string, email: string, password: string): { encrypted: string; iv: string; authTag: string } {
    const plaintext = `${email}:${password}`;
    return encryptCredentials(plaintext, this.encryptionKey);
  }

  /**
   * Saves cookies from context to storage
   * 
   * @param accountId - Account ID
   * @param context - Browser context
   */
  private async saveCookies(accountId: string, context: BrowserContext): Promise<void> {
    const cookies = await context.cookies();
    const serialized = JSON.stringify(cookies);
    const encrypted = this.encryptCookies(serialized);
    
    // This would be saved to database
    logger.info(`Saved ${cookies.length} cookies for account ${accountId}`);
    
    // Emit event for database update
    // await db.updateAccountCookies(accountId, encrypted);
  }

  /**
   * Encrypts cookie string
   */
  private encryptCookies(cookiesJson: string): string {
    const { encrypted, iv, authTag } = encryptCredentials(cookiesJson, this.encryptionKey);
    return `${encrypted}:${iv}:${authTag}`;
  }

  /**
   * Decrypts cookie string
   */
  private decryptCookies(encryptedCookies: string): Cookie[] {
    const parts = encryptedCookies.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted cookie format');
    }

    const [encrypted, iv, authTag] = parts;
    const decrypted = decryptCredentials(encrypted, iv, authTag, this.encryptionKey);
    return JSON.parse(decrypted) as Cookie[];
  }

  /**
   * Loads cookies into a browser context
   * 
   * @param context - Browser context
   * @param cookies - Cookie array
   */
  async loadCookies(context: BrowserContext, cookies: Cookie[]): Promise<void> {
    await context.addCookies(cookies);
  }
}

// Singleton instance
let sessionManager: LinkedInSessionManager | null = null;

export function getSessionManager(): LinkedInSessionManager {
  if (!sessionManager) {
    sessionManager = new LinkedInSessionManager();
  }
  return sessionManager;
}
