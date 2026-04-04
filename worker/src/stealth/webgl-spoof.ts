/**
 * WebGL vendor and renderer spoofing
 * Randomizes WebGL fingerprint to prevent tracking
 */

import type { FingerprintProfile } from '../types/index.js';

/**
 * Realistic WebGL vendor/renderer profiles
 * These match real GPU configurations
 */
export const WEBGL_PROFILES: Array<{ vendor: string; renderer: string; unmaskedVendor: string; unmaskedRenderer: string }> = [
  {
    vendor: 'Intel Inc.',
    renderer: 'Intel Iris OpenGL Engine',
    unmaskedVendor: 'Intel Inc.',
    unmaskedRenderer: 'Intel(R) Iris(TM) Plus Graphics 640'
  },
  {
    vendor: 'Intel Inc.',
    renderer: 'Intel Iris Xe Graphics',
    unmaskedVendor: 'Intel Inc.',
    unmaskedRenderer: 'Intel(R) Iris(TM) Xe Graphics'
  },
  {
    vendor: 'NVIDIA Corporation',
    renderer: 'NVIDIA GeForce GTX 1060/PCIe/SSE2',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce GTX 1060 6GB'
  },
  {
    vendor: 'NVIDIA Corporation',
    renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce RTX 3060 Laptop GPU'
  },
  {
    vendor: 'ATI Technologies Inc.',
    renderer: 'AMD Radeon Pro 5300M',
    unmaskedVendor: 'ATI Technologies Inc.',
    unmaskedRenderer: 'AMD Radeon Pro 5300M OpenGL Engine'
  },
  {
    vendor: 'ATI Technologies Inc.',
    renderer: 'AMD Radeon RX 580',
    unmaskedVendor: 'ATI Technologies Inc.',
    unmaskedRenderer: 'Radeon RX 580 Series'
  },
  {
    vendor: 'Apple Inc.',
    renderer: 'Apple M1',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M1'
  },
  {
    vendor: 'Apple Inc.',
    renderer: 'Apple M2',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M2'
  },
  {
    vendor: 'Google Inc.',
    renderer: 'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc.',
    unmaskedRenderer: 'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
];

/**
 * WebGL parameter constants
 */
const WEBGL_PARAMS = {
  VENDOR: 0x1F00,           // UNMASKED_VENDOR_WEBGL
  RENDERER: 0x1F01,         // UNMASKED_RENDERER_WEBGL
  VERSION: 0x1F02,          // VERSION
  SHADING_LANGUAGE_VERSION: 0x8B8C,
} as const;

/**
 * Builds a WebGL spoofing script for the given profile
 * 
 * @param profileIndex - Index into WEBGL_PROFILES array
 * @returns JavaScript code to inject into the page
 */
export function buildWebGLSpoofScript(profileIndex: number): string {
  const profile = WEBGL_PROFILES[profileIndex % WEBGL_PROFILES.length];
  
  return `
(() => {
  'use strict';
  
  const VENDOR = '${profile.vendor}';
  const RENDERER = '${profile.renderer}';
  const UNMASKED_VENDOR = '${profile.unmaskedVendor}';
  const UNMASKED_RENDERER = '${profile.unmaskedRenderer}';
  
  const VENDOR_PNAME = 0x1F00;
  const RENDERER_PNAME = 0x1F01;
  
  // Override WebGLRenderingContext
  const getParameterProxy = {
    apply: function(target, thisArg, argumentsList) {
      const param = argumentsList[0];
      if (param === VENDOR_PNAME) return VENDOR;
      if (param === RENDERER_PNAME) return RENDERER;
      return Reflect.apply(target, thisArg, argumentsList);
    }
  };
  
  if (window.WebGLRenderingContext) {
    const origGetParameter = window.WebGLRenderingContext.prototype.getParameter;
    window.WebGLRenderingContext.prototype.getParameter = new Proxy(origGetParameter, getParameterProxy);
  }
  
  if (window.WebGL2RenderingContext) {
    const origGetParameter2 = window.WebGL2RenderingContext.prototype.getParameter;
    window.WebGL2RenderingContext.prototype.getParameter = new Proxy(origGetParameter2, getParameterProxy);
  }
  
  // Override getShaderPrecisionFormat for consistency
  const overrideShaderPrecision = (proto) => {
    if (!proto || !proto.getShaderPrecisionFormat) return;
    const orig = proto.getShaderPrecisionFormat;
    proto.getShaderPrecisionFormat = function(shaderType, precisionType) {
      const result = orig.call(this, shaderType, precisionType);
      if (result) {
        // Return consistent values
        return {
          precision: 23,
          rangeMin: 127,
          rangeMax: 127
        };
      }
      return result;
    };
  };
  
  overrideShaderPrecision(window.WebGLRenderingContext?.prototype);
  overrideShaderPrecision(window.WebGL2RenderingContext?.prototype);
  
  // Override getSupportedExtensions to return consistent list
  const overrideExtensions = (proto) => {
    if (!proto || !proto.getSupportedExtensions) return;
    const orig = proto.getSupportedExtensions;
    proto.getSupportedExtensions = function() {
      const extensions = orig.call(this) || [];
      // Ensure consistent ordering
      return [...extensions].sort();
    };
  };
  
  overrideExtensions(window.WebGLRenderingContext?.prototype);
  overrideExtensions(window.WebGL2RenderingContext?.prototype);
})();
';
}

/**
 * Gets a WebGL profile for a fingerprint
 * 
 * @param profile - The account's fingerprint profile
 * @returns The WebGL profile at the stored index
 */
export function getWebGLProfile(profile: FingerprintProfile) {
  return WEBGL_PROFILES[profile.webglProfileIndex % WEBGL_PROFILES.length];
}
