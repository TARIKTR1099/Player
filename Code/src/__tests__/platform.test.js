import { describe, it, expect, beforeEach } from 'vitest';
import { getPlatform, isElectron, isCapacitor, resetPlatformCache } from '../platform.js';

describe('platform detection', () => {
  beforeEach(() => {
    resetPlatformCache();
    delete globalThis.window.require;
    delete globalThis.window.Capacitor;
  });

  it('returns "web" in standard browser environment', () => {
    expect(getPlatform()).toBe('web');
    expect(isElectron()).toBe(false);
    expect(isCapacitor()).toBe(false);
  });

  it('returns "electron" when window.require("electron") is truthy', () => {
    globalThis.window.require = () => ({ ipcRenderer: {} });
    expect(getPlatform()).toBe('electron');
    expect(isElectron()).toBe(true);
  });

  it('returns capacitor platform when window.Capacitor exists', () => {
    globalThis.window.Capacitor = { getPlatform: () => 'android' };
    expect(getPlatform()).toBe('android');
    expect(isCapacitor()).toBe(true);
    expect(isElectron()).toBe(false);
  });

  it('caches result after first call', () => {
    expect(getPlatform()).toBe('web');
    // Change environment after first call — should still return cached "web"
    globalThis.window.require = () => ({ ipcRenderer: {} });
    expect(getPlatform()).toBe('web');
  });
});
