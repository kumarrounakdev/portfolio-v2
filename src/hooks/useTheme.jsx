import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'portfolio.theme';
const THEME_PREFERENCES = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

function readStoredPreference() {
  if (typeof window === 'undefined' || !window.localStorage) return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(stored) ? stored : 'system';
  } catch (error) {
    return 'system';
  }
}

/**
 * The colours the root is painted with *right now*. A swap overwrites them, so
 * they are read immediately before it: they are what the dissolve is made of.
 */
function outgoingSurface(root) {
  const style = window.getComputedStyle(root);
  const read = (token) => style.getPropertyValue(token).trim();
  const vars = {};
  for (const [from, to] of [
    ['--desk-base', '--veil-base'],
    ['--desk-a', '--veil-a'],
    ['--desk-b', '--veil-b'],
    ['--desk-c', '--veil-c'],
  ]) {
    const value = read(from);
    if (value) vars[to] = value;
  }
  return vars;
}

/**
 * Appearance handling: the *preference* (light | dark | system) is persisted and
 * the *resolved* value is written to <html data-theme> so CSS variables flip for
 * the whole interface in one paint, while the appearance being left behind
 * dissolves over the top of it.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const dissolve = previous && previous !== theme && !reduce ? outgoingSurface(root) : null;

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-preference', preference);

    if (!dissolve) return undefined;

    // A switch is one frame of the appearance you left, dissolved into the one
    // you chose. It is not painted on a first load (the inline script in
    // index.html has settled the theme before the first frame) and it is not an
    // animation for anyone who asked for stillness.
    const veil = document.createElement('div');
    veil.className = 'theme-veil';
    veil.setAttribute('aria-hidden', 'true');
    for (const [name, value] of Object.entries(dissolve)) veil.style.setProperty(name, value);
    document.body.appendChild(veil);

    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      veil.remove();
    };
    veil.addEventListener('animationend', finish);
    const timer = window.setTimeout(finish, 900);
    return () => {
      window.clearTimeout(timer);
      finish();
    };
  }, [theme, preference]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (error) {
      /* private mode / storage disabled: the theme still works for this visit */
    }
  }, [preference]);

  const setPreference = useCallback((next) => {
    if (THEME_PREFERENCES.includes(next)) setPreferenceState(next);
  }, []);

  // Menu-bar toggle: flip light/dark, starting from whatever "system" resolves to.
  const toggle = useCallback(() => {
    setPreferenceState((current) => {
      const resolved = current === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : current;
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const cycle = useCallback(() => {
    setPreferenceState(
      (current) => THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(current) + 1) % THEME_PREFERENCES.length],
    );
  }, []);

  const value = useMemo(
    () => ({ theme, preference, resolvedIsDark: theme === 'dark', setPreference, toggle, cycle }),
    [theme, preference, setPreference, toggle, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}

export default useTheme;
