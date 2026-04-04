/**
 * LinkedIn DOM Selectors
 * These are frequently updated by LinkedIn and must be maintained
 * Last verified: 2024-12
 */

export const SELECTORS = {
  // Authentication
  auth: {
    emailInput: '#username',
    passwordInput: '#password',
    submitButton: 'button[type="submit"]',
    captchaFrame: 'iframe[src*="captcha"], iframe[src*="checkpoint"]',
    verificationInput: '#input__phone_verification_pin',
    twoFaOptions: '[data-test*="challenge"]',
  },

  // Feed / Navigation
  feed: {
    container: '[data-finite-scroll-hotkey-context="FEED"]',
    post: '.feed-shared-update-v2',
    navHome: 'a[href="/feed/"]',
    navNetwork: 'a[href="/mynetwork/"]',
    navJobs: 'a[href="/jobs/"]',
    navMessaging: 'a[href*="/messaging/"]',
    navNotifications: 'a[href*="/notifications/"]',
  },

  // Messaging
  messaging: {
    // Conversation list
    conversationList: '.msg-conversations-container__conversations-list',
    conversationItem: '.msg-conversation-listitem',
    conversationLink: 'a.msg-conversation-listitem__link',
    conversationPreview: '.msg-conversation-listitem__message-snippet',
    conversationTimestamp: '.msg-conversation-listitem__time',
    unreadBadge: '.msg-conversation-card__unread-count',
    
    // Conversation detail
    messageThread: '.msg-s-message-list',
    messageItem: '.msg-s-event-listitem',
    messageText: '.msg-s-event-listitem__body',
    messageTimestamp: '.msg-s-message-group__timestamp',
    senderName: '.msg-s-message-group__name',
    
    // Input
    messageInput: '.msg-form__contenteditable[contenteditable="true"]',
    messageInputContainer: '.msg-form__msg-content-container',
    sendButton: '.msg-form__send-button:not([disabled])',
    sendButtonDisabled: '.msg-form__send-button[disabled]',
    emojiButton: '[data-test-icon="emoji-medium"]',
    attachmentButton: '[data-test-icon="attach-medium"]',
    
    // New conversation
    newMessageButton: '.msg-overlay-bubble-header__new-convo-button, [data-test="new-message-button"]',
    searchInput: '.msg-connections-typeahead__search-input',
    searchResult: '.msg-connections-typeahead__result',
    connectButton: '[aria-label*="Connect"]',
  },

  // Profile
  profile: {
    container: '.profile',
    name: 'h1[data-testid="profile-card-name"]',
    headline: '.text-body-medium',
    company: '.pv-text-details__right-panel-item-text',
    location: '.pv-text-details__left-panel-item-text',
    about: '[data-testid="about-section"] .inline-show-more-text',
    experience: '#experience ~ .pvs-list__outer-container',
    education: '#education ~ .pvs-list__outer-container',
    avatar: '.pv-top-card-profile-picture__image',
    
    // Actions
    connectButton: 'button[aria-label*="Connect"], [data-testid="connect-button"]',
    messageButton: 'button[aria-label*="Message"], [data-testid="message-button"]',
    moreActionsButton: '[aria-label*="More actions"]',
    followButton: 'button[aria-label*="Follow"]',
  },

  // Connections / Network
  connections: {
    // Manage invitations
    invitationsTab: '.mn-invitations-tabs__tab[href*="invitation-manager"]',
    pendingInvitation: '.invitation-card',
    acceptButton: '[aria-label*="Accept"]',
    ignoreButton: '[aria-label*="Ignore"]',
    withdrawButton: '[aria-label*="Withdraw"]',
    
    // Send invitation
    addNoteButton: '[aria-label="Add a note"]',
    noteInput: '#custom-message, textarea[name="message"]',
    sendInvitationButton: '[aria-label*="Send invitation"], button[type="submit"]',
    connectModal: '.send-invite',
    
    // My Network
    peopleYouMayKnow: '.mn-discovery-entity-card',
    connectButtonSmall: 'button[aria-label*="Connect"]',
  },

  // Search
  search: {
    searchInput: '.search-global-typeahead__input',
    searchSubmit: '.search-global-typeahead__search-icon-container',
    resultsContainer: '.search-results-container',
    resultItem: '.entity-result',
    peopleTab: 'button[aria-label*="People"]',
    nextPageButton: '[aria-label*="Next"]',
    pageNumber: '.artdeco-pagination__indicator',
    
    // Filters
    allFiltersButton: '[aria-label*="Show all filters"]',
    connectionFilter: '[aria-label*="Connections"]',
    locationFilter: '[aria-label*="Locations"]',
    currentCompanyFilter: '[aria-label*="Current company"]',
  },

  // Notifications
  notifications: {
    badge: '.notification-badge__count',
    list: '.notifications-container',
    item: '.nt-card',
    itemText: '.nt-card__text',
    itemTime: '.nt-card__time-stamp',
    markAsRead: '[aria-label*="Mark as read"]',
  },

  // Modals / Overlays
  modals: {
    overlay: '.artdeco-modal-overlay',
    modalContainer: '.artdeco-modal',
    dismissButton: '[aria-label*="Dismiss"]',
    confirmButton: '.artdeco-button--primary',
    cancelButton: '.artdeco-button--secondary',
  },

  // CAPTCHA / Challenges
  challenges: {
    captchaContainer: '#captcha-internal',
    checkpointContainer: '[data-test="checkpoint-container"]',
    emailChallenge: '[data-test="email-pin-challenge"]',
    phoneChallenge: '[data-test="phone-pin-challenge"]',
  },
} as const;

/**
 * Waits for any of the given selectors to appear
 * Useful when LinkedIn uses multiple possible selectors for the same element
 */
export async function waitForAnySelector(
  page: import('rebrowser-playwright').Page,
  selectors: string[],
  options: { timeout?: number; visible?: boolean } = {}
): Promise<string | null> {
  const { timeout = 10000, visible = true } = options;
  
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          if (!visible) return selector;
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) return selector;
        }
      } catch {
        // Continue to next selector
      }
    }
    await page.waitForTimeout(100);
  }
  
  return null;
}

/**
 * Safely clicks an element with fallback selectors
 */
export async function safeClick(
  page: import('rebrowser-playwright').Page,
  selectors: string[],
  options: { timeout?: number; force?: boolean } = {}
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: options.timeout || 5000 });
      await element.click({ force: options.force });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Gets text content from an element safely
 */
export async function getTextContent(
  page: import('rebrowser-playwright').Page,
  selector: string
): Promise<string | null> {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    return await element.textContent();
  } catch {
    return null;
  }
}

/**
 * Checks if an element exists on the page
 */
export async function elementExists(
  page: import('rebrowser-playwright').Page,
  selector: string
): Promise<boolean> {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch {
    return false;
  }
}
