/**
 * Canvas fingerprint randomization
 * Injects noise into canvas operations to create unique but consistent fingerprints per account
 */

/**
 * Generates a canvas noise injection script with the given seed
 * The same seed will produce the same noise pattern, ensuring consistency per account
 * 
 * @param seed - A numeric seed for the noise generator (stored per account)
 * @returns JavaScript code to inject into the page
 */
export function buildCanvasNoiseScript(seed: number): string {
  return `
(() => {
  'use strict';
  
  const SEED = ${seed};
  
  // Simple PRNG based on seed
  let randState = SEED;
  const rand = () => {
    randState = (randState * 9301 + 49297) % 233280;
    return randState / 233280;
  };
  
  // Generate noise value from seed
  const getNoise = () => Math.floor(rand() * 8) - 4; // -4 to +4
  
  // Override getImageData
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
    const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
    
    // Reset RNG with seed for consistency
    randState = SEED;
    
    // Add subtle noise to pixel data
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Only modify some pixels to be less detectable
      if (rand() > 0.7) {
        const noise = getNoise();
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (noise >> 1)));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + (noise >> 2)));
      }
    }
    
    return imageData;
  };
  
  // Override toDataURL
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, encoderOptions) {
    // Apply noise by getting image data first
    const ctx = this.getContext('2d');
    if (ctx && this.width > 0 && this.height > 0) {
      try {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {}
    }
    return originalToDataURL.call(this, type, encoderOptions);
  };
  
  // Override toBlob
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(callback, type, encoderOptions) {
    const ctx = this.getContext('2d');
    if (ctx && this.width > 0 && this.height > 0) {
      try {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {}
    }
    return originalToBlob.call(this, callback, type, encoderOptions);
  };
  
  // Override isPointInPath and isPointInStroke for consistency
  const originalIsPointInPath = CanvasRenderingContext2D.prototype.isPointInPath;
  CanvasRenderingContext2D.prototype.isPointInPath = function(path, x, y, fillRule) {
    // Add tiny random offset to make fingerprinting less reliable
    if (typeof x === 'number') {
      x = x + (rand() - 0.5) * 0.001;
    }
    if (typeof y === 'number') {
      y = y + (rand() - 0.5) * 0.001;
    }
    return originalIsPointInPath.call(this, path, x, y, fillRule);
  };
})();
';
}

/**
 * Generates a unique canvas seed for a new account
 * This seed should be stored and reused for consistent fingerprinting
 * 
 * @returns A random seed number between 1 and 2147483647
 */
export function generateCanvasSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}
