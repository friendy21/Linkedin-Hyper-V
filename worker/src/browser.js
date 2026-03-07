import { chromium } from 'rebrowser-playwright';

const ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--use-gl=egl',
    '--use-angle=swiftshader-webgl',
    '--window-size=1366,768',
    '--start-maximized',
    '--lang=en-US,en',
    '--disable-extensions',
    '--disable-infobars',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    '--use-mock-keychain'
];

export const createBrowser = async (proxyUrl) => {
    const options = {
        headless: false,
        executablePath: '/usr/bin/google-chrome-stable',
        channel: 'chrome',
        args: ARGS
    };
    if (proxyUrl) {
        options.proxy = { server: proxyUrl };
    }
    return await chromium.launch(options);
};

export const createContext = async (browser) => {
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        colorScheme: 'light',
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false
    });

    await context.addInitScript(() => {
        delete Object.getPrototypeOf(navigator).webdriver;
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
            ]
        });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
        Object.defineProperty(screen, 'width', { get: () => 1366 });
        Object.defineProperty(screen, 'height', { get: () => 768 });
        Object.defineProperty(screen, 'availWidth', { get: () => 1366 });
        Object.defineProperty(screen, 'availHeight', { get: () => 728 });
    });

    return context;
};
