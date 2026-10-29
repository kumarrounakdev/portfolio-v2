import { useEffect, useState } from 'react';

/** Subscribes to a CSS media query and re-renders on change. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(list.matches);
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return matches;
}

/**
 * A phone-sized surface: windows behave as full-height apps and the Dock becomes
 * a tab bar. Height is part of the test because a landscape iPhone is 844px wide
 * but no taller than a wristwatch, and `(pointer: coarse)` keeps a short desktop
 * window on the desktop layout. The stylesheet repeats this query verbatim, and
 * anything that has to answer "which layout is this?" mid-action asks this
 * constant instead of remembering what a render once said.
 */
export const COMPACT_QUERY = '(max-width: 767px), (max-height: 560px) and (pointer: coarse)';

export function useIsCompact() {
  return useMediaQuery(COMPACT_QUERY);
}

/** ≥ 1024px: room for a column of widgets on the wallpaper beside a window. */
export function useHasWidgetRail() {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Wide enough for the desktop to give up its left gutter to the phone preview:
 * 306px of device, the desktop padding on both sides of it, and enough height
 * that a window still has somewhere to be. phone.css repeats this string
 * verbatim for the `--phone-space` reservation, so the component and the
 * measure can never disagree — either both apply or neither does.
 */
export const PHONE_GUTTER_MEDIA = '(min-width: 1240px) and (min-height: 700px)';

export function usePhoneGutter() {
  return useMediaQuery(PHONE_GUTTER_MEDIA);
}

/** Fine pointer = a mouse/trackpad, so hover magnification is appropriate. */
export function useHasFinePointer() {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

export default useMediaQuery;
