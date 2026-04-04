/**
 * Scripts to erase navigator.webdriver and other automation indicators
 * These are injected into every page to mask automation signatures
 */

/**
 * Main script to erase webdriver properties and fix automation leaks
 */
export const ERASE_WEBDRIVER_SCRIPT = `
(() => {
  'use strict';
  
  // Erase navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true,
  });
  
  // Delete webdriver from prototype chain
  if (navigator.__proto__) {
    delete navigator.__proto__.webdriver;
  }
  
  // Fix chrome object to appear natural
  window.chrome = {
    runtime: {
      OnInstalledReason: { CHROME_UPDATE: "chrome_update", INSTALL: "install", SHARED_MODULE_UPDATE: "shared_module_update", UPDATE: "update" },
      OnRestartRequiredReason: { APP_UPDATE: "app_update", OS_UPDATE: "os_update", PERIODIC: "periodic" },
      PlatformArch: { ARM: "arm", ARM64: "arm64", MIPS: "mips", MIPS64: "mips64", MIPS64EL: "mips64el", MIPSEL: "mipsel", X86_32: "x86-32", X86_64: "x86-64" },
      PlatformNaclArch: { ARM: "arm", MIPS: "mips", MIPS64: "mips64", MIPS64EL: "mips64el", MIPSEL: "mipsel", MIPSEL64: "mipsel64", X86_32: "x86-32", X86_64: "x86-64" },
      PlatformOs: { ANDROID: "android", CROS: "cros", LINUX: "linux", MAC: "mac", OPENBSD: "openbsd", WIN: "win" },
      RequestUpdateCheckStatus: { NO_UPDATE: "no_update", THROTTLED: "throttled", UPDATE_AVAILABLE: "update_available" }
    },
    loadTimes: function() {
      return {
        commitLoadTime: performance.timing.domContentLoadedEventStart / 1000,
        connectionInfo: 'h2',
        finishDocumentLoadTime: performance.timing.domContentLoadedEventEnd / 1000,
        finishLoadTime: performance.timing.loadEventEnd / 1000,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: performance.timing.domContentLoadedEventStart / 1000,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: performance.timing.requestStart / 1000,
        startLoadTime: performance.timing.domContentLoadedEventStart / 1000,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true
      };
    },
    csi: function() {
      return {
        onloadT: Date.now(),
        pageT: performance.now(),
        startE: performance.timing.navigationStart
      };
    },
    app: {
      isInstalled: false,
      InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
      RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" }
    }
  };
  
  // Fix permissions API to not leak automation
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({
        state: Notification.permission,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      } as PermissionStatus);
    }
    return originalQuery.call(window.navigator.permissions, parameters);
  };
  
  // Override plugins and mimeTypes to appear realistic
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      {
        0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        length: 1,
        name: "Chrome PDF Plugin"
      },
      {
        0: { type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin },
        description: "Portable Document Format plugin",
        filename: "internal-pdf-viewer2",
        length: 1,
        name: "Chrome PDF Viewer"
      },
      {
        0: { type: "application/x-nacl", suffixes: "", description: "", enabledPlugin: Plugin },
        1: { type: "application/x-pnacl", suffixes: "", description: "", enabledPlugin: Plugin },
        description: "",
        filename: "internal-nacl-plugin",
        length: 2,
        name: "Native Client"
      }
    ],
  });
  
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => [
      { type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin },
      { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
      { type: "application/x-nacl", suffixes: "", description: "", enabledPlugin: Plugin },
      { type: "application/x-pnacl", suffixes: "", description: "", enabledPlugin: Plugin }
    ],
  });
  
  // Fix notification permissions
  const originalNotification = window.Notification;
  Object.defineProperty(window, 'Notification', {
    get: function() {
      return originalNotification;
    },
    set: function(value) {
      originalNotification = value;
    }
  });
  
  // Remove automation-related properties
  delete window.__webdriver_evaluate;
  delete window.__selenium_evaluate;
  delete window.__selenium_unwrapped;
  delete window.__fxdriver_evaluate;
  delete window._phantom;
  delete window.callPhantom;
  delete window._selenium;
  delete window.callSelenium;
  delete window.domAutomation;
  delete window.domAutomationController;
  
  // Override toString on functions to hide native code
  const originalToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (this === window.navigator.permissions.query) {
      return 'function query() { [native code] }';
    }
    if (this === window.chrome.runtime.onMessage.addListener) {
      return 'function addListener() { [native code] }';
    }
    return originalToString.call(this);
  };
})();
';

/**
 * Script to fix iframe webdriver properties (recursive)
 */
export const IFRAME_WEBDRIVER_SCRIPT = `
(() => {
  'use strict';
  
  const eraseWebdriver = () => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });
  };
  
  // Apply to current window
  eraseWebdriver();
  
  // Apply to all iframes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'IFRAME') {
          try {
            if (node.contentWindow) {
              Object.defineProperty(node.contentWindow.navigator, 'webdriver', {
                get: () => undefined,
                configurable: true,
              });
            }
          } catch (e) {}
        }
      });
    });
  });
  
  observer.observe(document, { childList: true, subtree: true });
})();
';
