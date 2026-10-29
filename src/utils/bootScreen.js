/**
 * Taking the splash screen down.
 *
 * The splash is drawn by `index.html` before any JavaScript runs — see the comment
 * on `.boot` there — and this is the other half of that arrangement: the moment to
 * remove it, and the three cases that stop "remove it" from being a one-liner.
 *
 *   - a floor on screen, because a splash that appears and vanishes inside a tenth
 *     of a second reads as a flicker, which is worse than no splash at all;
 *   - a fade that is allowed to finish, with a timer behind it for the times the
 *     transition never fires (a hidden tab, reduced motion, an old engine);
 *   - and a hard ceiling, because a splash waiting forever for something that
 *     failed is the one way a preloader can turn into the whole page.
 *
 * Kept out of `main.jsx` so it can be exercised without mounting an application.
 */

const MIN_ON_SCREEN = 420;
const FADE_OUT = 260;
export const GIVE_UP = 8000;

const BOOT_ID = 'boot';
const DONE_CLASS = 'boot--done';

/** The node exists only in the documents `index.html` produced. */
function bootNode() {
  if (typeof document === 'undefined') return null;
  return document.getElementById(BOOT_ID);
}

/**
 * Start the exit, honouring the floor. Safe to call more than once: the second
 * call finds a node already marked as leaving (or gone) and does nothing.
 */
export function dismissBootScreen() {
  const node = bootNode();
  if (!node || node.classList.contains(DONE_CLASS)) return;

  const started = Number(node.dataset.startedAt) || 0;
  const elapsed = started ? Date.now() - started : MIN_ON_SCREEN;
  const remaining = Math.max(0, MIN_ON_SCREEN - elapsed);

  window.setTimeout(() => {
    node.classList.add(DONE_CLASS);
    const remove = () => node.remove();
    node.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, FADE_OUT + 120);
  }, remaining);
}

/**
 * Take it down regardless of the floor: what the ceiling above the app's own mount
 * calls, so a page whose bundle never arrived is not a splash screen forever.
 */
export function removeBootScreenNow() {
  bootNode()?.remove();
}

export default dismissBootScreen;
