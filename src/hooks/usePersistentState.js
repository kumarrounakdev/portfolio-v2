import { useCallback, useEffect, useRef, useState } from 'react';

/* One write, many readers: two components holding the same key (the menu's
   “Show Desktop Icons” checkmark and the same switch in Settings) stay in step
   without either owning the other. A CustomEvent rather than the `storage`
   event, because that one only fires in *other* tabs. */
const SYNC_EVENT = 'portfolio:storage-sync';

/**
 * useState + localStorage, for the two interface preferences this portfolio
 * keeps: appearance is handled in useTheme, this covers text size and the
 * desktop-icon visibility. Fails silently where storage is blocked (Safari
 * private mode), so the UI still works for the current visit.
 */
export function usePersistentState(key, initialValue, { parse, serialize } = {}) {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return parse ? parse(raw) : JSON.parse(raw);
    } catch (error) {
      return initialValue;
    }
  }, [key, initialValue, parse]);

  const [value, setValue] = useState(read);
  const lastWritten = useRef(null);

  useEffect(() => {
    const raw = serialize ? serialize(value) : JSON.stringify(value);
    lastWritten.current = raw;
    try {
      window.localStorage.setItem(key, raw);
    } catch (error) {
      /* ignore */
    }
    // Constructed off `window`, not the bare global: this module runs in the app
    // realm, where `CustomEvent` is only guaranteed as a property of the window
    // (a test environment can define `window` without adopting its constructors).
    if (typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new window.CustomEvent(SYNC_EVENT, { detail: { key, raw } }));
    }
  }, [key, value, serialize]);

  useEffect(() => {
    const onSync = (event) => {
      const detail = event?.detail;
      if (!detail || detail.key !== key) return;
      if (detail.raw === lastWritten.current) return;
      setValue(read());
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [key, read]);

  return [value, setValue];
}

export default usePersistentState;
