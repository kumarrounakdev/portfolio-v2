/**
 * The browser storage this interface owns.
 *
 * Two things live here so that the code writing preferences and the Settings
 * pane reporting them cannot disagree: the key names, and the only two
 * operations that touch everything under the prefix (list, clear). Listing goes
 * through `localStorage` itself rather than a constant array, so what the
 * Storage pane shows is what is actually on the device — including nothing at
 * all, which is the honest answer in private browsing.
 */

const STORAGE_PREFIX = 'portfolio.';
export const DESKTOP_ICONS_KEY = 'portfolio.desktop-icons';

/** Keys currently stored, with their size and a short preview of the value. */
export function storedEntries() {
  const entries = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key) ?? '';
      entries.push({
        key,
        bytes: raw.length,
        preview: raw.length > 52 ? `${raw.slice(0, 52)}…` : raw,
      });
    }
  } catch (error) {
    // A blocked store is a state, not a crash: the pane says so.
    return [];
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

/** Removes every entry under the prefix. Returns how many went, or -1 when the
 *  storage itself could not be written to. */
export function clearStoredEntries() {
  const entries = storedEntries();
  if (entries.length === 0) return 0;
  try {
    entries.forEach(({ key }) => window.localStorage.removeItem(key));
    return entries.length;
  } catch (error) {
    return -1;
  }
}

export default STORAGE_PREFIX;
