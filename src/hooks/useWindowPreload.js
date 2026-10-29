import { useEffect } from 'react';
import { windowRegistry } from '../windows/registry.jsx';

/**
 * Warms the deferred window chunks without competing with the first paint.
 *
 * Every application but the Portfolio window is its own chunk (see
 * `src/windows/registry.jsx`), so the right time to fetch one is after the desktop
 * is on screen — not before it, and not only on click. What counts as "after" is
 * decided here honestly:
 *
 *   · a device that asked for its data to be saved gets no idle prefetch at all. It
 *     still prefetches on hover, because that is a stated intent to open a window;
 *   · a desktop has room to read ahead, so every window goes;
 *   · a phone gets only the apps its own Dock shows, because every extra chunk there
 *     is somebody's megabytes.
 *
 * Hover is handled where the tiles live (`Dock.jsx`), so this stays one job.
 */
export function useWindowPreload({ isCompact = false } = {}) {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.connection?.saveData) return undefined;

    const queue = windowRegistry.filter(
      (definition) =>
        typeof definition.preload === 'function' &&
        (!isCompact || definition.dock?.mobile === true),
    );
    if (!queue.length) return undefined;

    let cancelled = false;
    let index = 0;

    const step = () => {
      if (cancelled || index >= queue.length) return;
      const definition = queue[index];
      index += 1;
      /* One at a time: ten parallel requests on a slow connection is how a warm cache
         stops being free. A chunk that will not arrive is the window's own problem,
         and it says so when the visitor asks for it. */
      Promise.resolve()
        .then(() => definition.preload())
        .catch(() => {})
        .then(() => step());
    };

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(step, { timeout: 2500 })
      : window.setTimeout(step, 1200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [isCompact]);
}

export default useWindowPreload;
