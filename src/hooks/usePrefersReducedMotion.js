import { useSyncExternalStore } from 'react';
import { useMediaQuery } from './useMediaQuery.js';

/**
 * Reduced motion, from either of the two places a person can ask for it.
 *
 * The OS setting is the default and a stylesheet reads it for free, but it is not
 * reachable mid-session from a web page, and a reader who wants still windows
 * should not have to leave the site to get them. So Settings offers a switch, and
 * this hook reports the answer the app should act on: the reader's own choice when
 * there is one, the system setting otherwise. Nothing in the app should read the
 * media query directly — one answer, one place.
 */

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** Stored as 'on' | 'off'; absent means "follow the system". */
const STORAGE_KEY = 'portfolio.reduce-motion';

const listeners = new Set();
let stored = null;
let read = false;

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'on') return true;
    if (value === 'off') return false;
  } catch (error) {
    /* storage blocked — the system setting stands */
  }
  return null;
}

function getOverride() {
  if (!read) {
    read = true;
    stored = readStored();
  }
  return stored;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Set the reader's choice, or pass null to hand the decision back to the system.
 * Exported as a plain function as well as a hook because a switch is not the only
 * thing that could ever set it.
 */
export function setMotionOverride(value) {
  stored = value === null || value === undefined ? null : Boolean(value);
  read = true;
  try {
    if (stored === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, stored ? 'on' : 'off');
  } catch (error) {
    /* storage blocked: the choice lasts for this visit, which is still the right
       behaviour for a page that cannot remember anything */
  }
  listeners.forEach((listener) => listener());
}

/** The OS setting alone — what a switch should show as its default. */
export function useSystemPrefersReducedMotion() {
  return useMediaQuery(REDUCE_QUERY);
}

/** The reader's own choice, or null when they have not made one. */
export function useMotionOverride() {
  return useSyncExternalStore(subscribe, getOverride, () => null);
}

/** Honours the OS "reduce motion" setting, and the switch in Settings. */
export function usePrefersReducedMotion() {
  const system = useSystemPrefersReducedMotion();
  const override = useMotionOverride();
  return override === null ? system : override;
}

export default usePrefersReducedMotion;
