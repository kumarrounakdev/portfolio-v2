import { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery.js';
import { profile } from '../data/portfolio.js';

/**
 * Interface guards: the browser context menu and the usual developer-tools
 * shortcuts are suppressed, so the desktop reads as an application.
 *
 * Stated plainly, because the honesty rule applies to the code too: a web page
 * cannot actually prevent inspection. Anyone determined can open devtools from
 * the browser menu, and the source is public. This only removes the reflex
 * right-click and the F12 chord, and it keeps both switchable — flip
 * `profile.guards` in `src/data/portfolio.js` to hand the browser its defaults
 * back. Text fields are never guarded, so selecting, pasting and the spelling
 * menu still work where they matter.
 *
 * A touch screen is left completely alone, because there a long press *is* the
 * copy command: guarding the context menu on a phone would take the only way to
 * select and copy anything. The keyboard chords are still guarded, since a
 * tablet can have a keyboard attached.
 */

/** Anything the visitor types into keeps its native menu. */
const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

const NOTES = {
  context: 'Right-click is turned off on this desktop — text fields still keep theirs.',
  devtools: 'Nothing here is hidden: the same content lives in these windows and in src/data.',
};

const NOTICE_MS = 3400;

export function useInteractionGuards() {
  const guards = profile.guards ?? {};
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const blockContext = guards.contextMenu !== false && !coarsePointer;
  const blockDevtools = guards.devtools !== false;
  const [note, setNote] = useState(null);

  const dismiss = useCallback(() => setNote(null), []);

  useEffect(() => {
    if (!blockContext && !blockDevtools) return undefined;

    let timer;
    const flash = (key) => {
      setNote({ key, text: NOTES[key] });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNote(null), NOTICE_MS);
    };

    const onContextMenu = (event) => {
      if (!blockContext) return;
      if (typeof event.target?.closest === 'function' && event.target.closest(FIELD_SELECTOR)) return;
      event.preventDefault();
      flash('context');
    };

    const onKeyDown = (event) => {
      if (!blockDevtools) return;
      const key = String(event.key ?? '').toLowerCase();
      const modifier = event.metaKey || event.ctrlKey;
      // Chrome/Edge/Firefox use the shift chord, Safari the alt one (⌘⌥I, ⌘⌥C).
      const opensTools = key === 'f12' || (modifier && (event.shiftKey || event.altKey) && ['i', 'j', 'c'].includes(key));
      const viewsSource = modifier && !event.shiftKey && key === 'u';
      if (!opensTools && !viewsSource) return;
      event.preventDefault();
      flash('devtools');
    };

    // Capture phase, so the guard sees the event before anything else does.
    document.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [blockContext, blockDevtools, coarsePointer]);

  return { note, dismiss };
}

export default useInteractionGuards;
