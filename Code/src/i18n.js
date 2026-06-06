// i18n.js — Lightweight TR/EN translation system for Player
// Lightweight: no external dependency, just a plain dictionary. The active
// language is read from the main Zustand store (where the Settings panel
// already writes `setLanguage`) so the same switch controls both the React
// UI and the Electron tray menu / notifications.

import tr from './locales/tr';
import en from './locales/en';

const dictionaries = { tr, en };

/**
 * t(key, params?)
 * Look up a translation key in the active language. Falls back to
 * the English value, then to the key itself, so missing translations
 * never crash the UI.
 *
 * Examples:
 *   t('player.play')              // 'Oynat' or 'Play'
 *   t('library.tracksFound', { count: 5 })  // '5 parça bulundu' / '5 tracks found'
 */
export function t(key, params) {
  // Lazy require: avoids a hard import cycle with store.js during tests.
  // The store exports a hook, so we read its current state without subscribing.
  let lang = 'tr';
  try {
    const { useStore } = require('./store');
    lang = useStore.getState().language || 'tr';
  } catch (e) {
    // Not in a React-aware context — fall back to Turkish.
  }
  const dict = dictionaries[lang] || dictionaries.tr;
  let str = dict[key];
  if (str === undefined) str = dictionaries.en[key];
  if (str === undefined) str = key;
  if (params && typeof str === 'string') {
    Object.keys(params).forEach((p) => {
      str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
    });
  }
  return str;
}

/**
 * React hook: returns the current `t` function bound to the active language.
 * The component re-renders whenever the language changes (because we read
 * the language through the Zustand selector).
 */
export function useTranslation() {
  // Subscribing to language here makes the component re-render on switch.
  let lang = 'tr';
  try {
    const { useStore } = require('./store');
    lang = useStore((s) => s.language) || 'tr';
  } catch (e) {
    // ignore — fall back to TR
  }
  const translate = (key, params) => {
    const dict = dictionaries[lang] || dictionaries.tr;
    let str = dict[key];
    if (str === undefined) str = dictionaries.en[key];
    if (str === undefined) str = key;
    if (params && typeof str === 'string') {
      Object.keys(params).forEach((p) => {
        str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
      });
    }
    return str;
  };
  return { t: translate, lang };
}

/** Direct dictionary export for the main process (tray, notifications, etc.). */
export function getDictionary(lang) {
  return dictionaries[lang] || dictionaries.tr;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
];
