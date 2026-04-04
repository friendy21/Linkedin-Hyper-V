/**
 * Chrome launch arguments for stealth mode
 * These arguments eliminate automation indicators and mimic real user browsers
 */

export const STEALTH_CHROME_ARGS = [
  // Automation hiding
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process,TranslateUI',
  '--disable-component-extensions-with-background-pages',
  
  // Sandbox settings (required for Docker)
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  
  // GPU and rendering
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',  // Required in Docker/Xvfb environment
  '--disable-software-rasterizer',
  
  // First run and defaults
  '--no-first-run',
  '--no-default-browser-check',
  '--no-zygote',
  
  // UI elements
  '--disable-infobars',
  '--disable-extensions',
  '--disable-plugins',
  '--disable-translate',
  '--disable-notifications',
  '--mute-audio',
  
  // Window size (randomized per launch)
  '--window-size=1366,768',
  '--start-maximized',
  
  // Memory and performance
  '--max-old-space-size=2048',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  
  // Security (don't disable entirely, but reduce fingerprinting)
  '--disable-features=InterestFeedContentSuggestions',
  '--disable-features=OptimizationHints',
  
  // Network
  '--disable-features=NetworkPrediction',
  '--force-webrtc-ip-handling-policy=default_public_interface_only',
] as const;

/**
 * Random viewport dimensions from real device pool
 * These are common laptop/desktop resolutions
 */
export const VIEWPORT_DIMENSIONS: Array<{ width: number; height: number; deviceScaleFactor: number }> = [
  { width: 1920, height: 1080, deviceScaleFactor: 1 },
  { width: 1366, height: 768, deviceScaleFactor: 1 },
  { width: 1440, height: 900, deviceScaleFactor: 1 },
  { width: 1536, height: 864, deviceScaleFactor: 1.25 },
  { width: 1680, height: 1050, deviceScaleFactor: 1 },
  { width: 1600, height: 900, deviceScaleFactor: 1 },
  { width: 1280, height: 720, deviceScaleFactor: 1 },
  { width: 2560, height: 1440, deviceScaleFactor: 1.5 },
];

/**
 * Common system fonts to simulate realistic font enumeration
 */
export const SYSTEM_FONTS = [
  'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
  'Book Antiqua', 'Bookman Old Style', 'Calibri', 'Cambria',
  'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook',
  'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
  'Georgia', 'Helvetica', 'Impact', 'Lucida Console',
  'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Monaco',
  'Monotype Corsiva', 'MS Gothic', 'MS PGothic', 'MS Reference Sans Serif',
  'MS Sans Serif', 'MS Serif', 'Palatino Linotype', 'Segoe Print',
  'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold',
  'Segoe UI Symbol', 'Tahoma', 'Times', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
];

/**
 * Timezone options matching common residential proxy locations
 */
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Asia/Tokyo',
  'Asia/Singapore',
];

/**
 * Locale and Accept-Language combinations
 */
export const LOCALES: Array<{ locale: string; acceptLanguage: string }> = [
  { locale: 'en-US', acceptLanguage: 'en-US,en;q=0.9' },
  { locale: 'en-GB', acceptLanguage: 'en-GB,en;q=0.9' },
  { locale: 'en-CA', acceptLanguage: 'en-CA,en;q=0.9' },
  { locale: 'en-AU', acceptLanguage: 'en-AU,en;q=0.9' },
];
