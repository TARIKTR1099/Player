// i18n.js — Lightweight TR/EN translation system for Player
// Lightweight: no external dependency, just a plain dictionary. The active
// language is read from the main Zustand store (where the Settings panel
// already writes `setLanguage`) so the same switch controls both the React
// UI and the Electron tray menu / notifications. Custom user-installed
// locales (drag-drop / GitHub) override built-ins for any matching code.

import tr from './locales/tr';
import en from './locales/en';

const dictionaries = { tr, en };

/** Strip the `__meta` key when looking up a string. */
const safeDict = (raw) => {
  if (!raw) return {};
  const out = {};
  for (const k of Object.keys(raw)) {
    if (k === '__meta') continue;
    out[k] = raw[k];
  }
  return out;
};

/**
 * Resolve a translation for `key` in the active language.
 * Lookup order: custom locales → built-in active language → English → key.
 */
function lookup(lang, key) {
  let custom = {};
  try {
    const { useStore } = require('./store');
    custom = useStore.getState().customLocales || {};
  } catch (_) {}
  const fromCustom = custom[lang] ? safeDict(custom[lang])[key] : undefined;
  if (fromCustom !== undefined) return fromCustom;
  const fromBuilt = dictionaries[lang] ? dictionaries[lang][key] : undefined;
  if (fromBuilt !== undefined) return fromBuilt;
  if (lang !== 'en' && dictionaries.en[key] !== undefined) return dictionaries.en[key];
  return undefined;
}

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
  let str = lookup(lang, key);
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
    let str = lookup(lang, key);
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
  // First try the user's custom locale, then fall back to the built-in.
  try {
    const { useStore } = require('./store');
    const custom = useStore.getState().customLocales || {};
    if (custom[lang]) return safeDict(custom[lang]);
  } catch (_) {}
  return dictionaries[lang] || dictionaries.tr;
}

/** List of installed (built-in + custom) languages, for Settings dropdowns. */
export function getInstalledLanguages() {
  const built = [
    { code: 'tr', label: 'Türkçe', kind: 'built-in' },
    { code: 'en', label: 'English', kind: 'built-in' },
  ];
  let custom = {};
  try {
    const { useStore } = require('./store');
    custom = useStore.getState().customLocales || {};
  } catch (_) {}
  const userLangs = Object.keys(custom)
    .filter((c) => c !== 'tr' && c !== 'en')
    .map((c) => ({
      code: c,
      label: custom[c]?.__meta?.label || c.toUpperCase(),
      kind: 'custom',
    }));
  return [...built, ...userLangs];
}

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
];
