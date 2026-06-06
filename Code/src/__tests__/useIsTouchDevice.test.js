import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';

describe('useIsTouchDevice', () => {
  let matchMediaListeners = [];
  const mockMatchMedia = (matches) => ({
    matches,
    addEventListener: (_e, cb) => matchMediaListeners.push(cb),
    removeEventListener: (_e, cb) => {
      matchMediaListeners = matchMediaListeners.filter((l) => l !== cb);
    },
  });

  beforeEach(() => {
    matchMediaListeners = [];
    // jsdom defaults to having ontouchstart; strip it for desktop test
    delete window.ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    window.matchMedia = vi.fn().mockImplementation((q) => {
      if (q === '(pointer: coarse)') return mockMatchMedia(false);
      return mockMatchMedia(false);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false on non-touch environments', () => {
    const { result } = renderHook(() => useIsTouchDevice());
    expect(typeof result.current).toBe('boolean');
    expect(result.current).toBe(false);
  });

  it('subscribes to matchMedia changes', () => {
    renderHook(() => useIsTouchDevice());
    expect(matchMediaListeners.length).toBe(1);
  });
});
