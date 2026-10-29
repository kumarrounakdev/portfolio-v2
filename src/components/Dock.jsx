import { useCallback, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { windowRegistry } from '../windows/registry.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { useHasFinePointer, useIsCompact } from '../hooks/useMediaQuery.js';
import { externalLinkProps } from '../utils/links.js';
import { AppIcon } from './AppIcon.jsx';
import { Tooltip } from './Tooltip.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import { Sun, Moon } from 'lucide-react';

const MAGNET_RADIUS = 78;
const MAX_SCALE = 1.26;
const MAX_LIFT = 10;

const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

const dockWindows = windowRegistry
  .filter((definition) => definition.dock)
  .sort((a, b) => a.dock.order - b.dock.order);

function buildItems(isCompact) {
  const items = dockWindows.map((definition) => ({
    kind: 'window',
    id: definition.id,
    label: isCompact ? definition.dock.mobileLabel : definition.dock.label,
    icon: definition.icon,
    accent: definition.accent,
    art: definition.art,
    mobile: Boolean(definition.dock.mobile),
    /* The chunk this tile's window lives in, warmed by a hover. */
    preload: definition.preload,
  }));

  const extras = [];
  if (!isCompact) {
    /* No résumé tile here any more: the CV is an application in its own right
       (registry id `resume`), and a second Dock icon for the same document would
       be two answers to one click — one opening a window, one leaving the site. */
    extras.push({ kind: 'separator', id: 'sep-apps' });
    extras.push({ kind: 'theme', id: 'theme', label: 'Toggle Appearance', icon: Sun });
  }

  return [...items, ...extras];
}

/**
 * macOS Dock. One component renders both forms:
 *   ≥768px  floating glass Dock with pointer magnification; a minimised window is a
 *           dot on its own tile, never a second tray of tiles beside it
 *   <768px  compact bottom bar (no hover-only behaviour, larger tap targets)
 */
export function Dock() {
  const isCompact = useIsCompact();
  const reducedMotion = usePrefersReducedMotion();
  const finePointer = useHasFinePointer();
  const { windows, openWindow, frontmostId, visibleIds } = useWindowManager();
  const { theme, toggle } = useTheme();
  const dockRef = useRef(null);
  const itemRefs = useRef(new Map());

  const items = useMemo(() => buildItems(isCompact), [isCompact]);

  const registerItem = useCallback((id, node) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  }, []);


  /* ------------------------------------------------- magnification ------ */
  useEffect(() => {
    if (isCompact || !finePointer || reducedMotion) return undefined;
    const dock = dockRef.current;
    if (!dock) return undefined;

    const entries = [];
    /* Cached with the rest of the geometry below. `pointermove` fires on every
       mouse movement across the bar, and a `getBoundingClientRect()` inside that
       handler forces the browser to flush layout before it can answer — the one
       read in this file that used to cost a frame under a slow pointer. The dock
       cannot move between two pointer events; `measure` runs on resize and
       orientation change, which are the only things that move it. */
    let dockRect = dock.getBoundingClientRect();

    const measure = () => {
      entries.forEach((entry) => gsap.killTweensOf(entry.node));
      entries.length = 0;
      dockRect = dock.getBoundingClientRect();
      items.forEach((item) => {
        const node = itemRefs.current.get(item.id);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        entries.push({
          node,
          // Cached because transform-only magnification cannot move an icon's
          // centre horizontally; measuring on resize is enough.
          center: rect.left + rect.width / 2 - dockRect.left,
          scale: gsap.quickTo(node, 'scale', { duration: 0.25, ease: 'power3.out' }),
          y: gsap.quickTo(node, 'y', { duration: 0.25, ease: 'power3.out' }),
        });
      });
    };

    const apply = (clientX) => {
      const pointerX = clientX - dockRect.left;
      entries.forEach((entry) => {
        const influence = Math.max(0, 1 - Math.abs(pointerX - entry.center) / MAGNET_RADIUS);
        const eased = easeOutQuad(influence);
        entry.scale(1 + (MAX_SCALE - 1) * eased);
        entry.y(-MAX_LIFT * eased);
      });
    };

    const reset = () => entries.forEach((entry) => {
      entry.scale(1);
      entry.y(0);
    });

    const onMove = (event) => apply(event.clientX);
    const onLeave = () => reset();

    measure();
    dock.addEventListener('pointermove', onMove);
    dock.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      dock.removeEventListener('pointermove', onMove);
      dock.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      entries.forEach((entry) => {
        gsap.killTweensOf(entry.node);
      });
      entries.length = 0;
    };
  }, [isCompact, finePointer, reducedMotion, items]);

  /* ------------------------------------------------- launch bounce ------ */
  const bounce = useCallback(
    (id) => {
      if (isCompact || reducedMotion) return;
      const node = itemRefs.current.get(id);
      if (!node) return;
      gsap.killTweensOf(node);
      gsap.fromTo(
        node,
        { y: 0 },
        {
          y: -13,
          duration: 0.16,
          ease: 'power2.out',
          keyframes: [
            { y: -13, duration: 0.16, ease: 'power2.out' },
            { y: 0, duration: 0.2, ease: 'bounce.out' },
            { y: -6, duration: 0.12, ease: 'power2.out' },
            { y: 0, duration: 0.16, ease: 'power2.out' },
          ],
          onComplete: () => gsap.set(node, { clearProps: 'transform' }),
        },
      );
    },
    [isCompact, reducedMotion],
  );

  /* One code path for every kind of click: the manager decides whether that
     means raising an already-visible window, restoring a minimised one, opening
     a closed one — and, on a phone, dismissing the sheet in front of it. */
  const activate = (item) => {
    if (item.kind === 'window') {
      const state = windows[item.id];
      if (!state?.open) bounce(item.id);
      openWindow(item.id, { origin: 'dock' });
      return;
    }
    if (item.kind === 'theme') {
      toggle();
    }
  };

  /* ------------------------------------------------------------ render -- */
  if (isCompact) {
    const mobileItems = items.filter((item) => item.kind === 'window' && item.mobile).slice(0, 5);
    return (
      <nav className="mobilebar" aria-label="Portfolio sections" data-app-open={visibleIds.length > 0 ? 'true' : 'false'}>
        {mobileItems.map((item) => {
          const state = windows[item.id];
          const active = frontmostId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="mobilebar__item"
              data-active={active ? 'true' : 'false'}
              aria-current={active ? 'page' : undefined}
              onClick={() => openWindow(item.id, { origin: 'dock' })}
            >
              {/* No size here on purpose: the tile is 46px because the stylesheet
                  says so, and an inline size outranks every rule — one used to pin
                  the phone dock at a 26px mark no CSS could budge. */}
              <AppIcon icon={item.icon} accent={item.accent} art={item.art} />
              <span className="mobilebar__label">{item.label}</span>
              {state?.open ? (
                <span
                  className="mobilebar__dot"
                  data-state={state.minimized ? 'minimized' : 'open'}
                  aria-hidden="true"
                />
              ) : null}
              <span className="sr-only">
                {state?.open ? (state.minimized ? ' — minimised' : ' — open') : ''}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="dock-shell">
      <div className="dock" role="group" aria-label="Dock" ref={dockRef}>
        {items.map((item) => {
          if (item.kind === 'separator') {
            return <span className="dock__separator" key={item.id} aria-hidden="true" />;
          }

          const state = item.kind === 'window' ? windows[item.id] : null;
          const running = Boolean(state?.open);
          const minimized = Boolean(state?.open && state.minimized);
          const label =
            item.kind === 'window'
              ? `${item.label}${running ? (minimized ? ' — minimised, click to restore' : ' — window open') : ''}`
              : item.label;
          const icon = item.kind === 'theme' ? (theme === 'dark' ? Moon : Sun) : item.icon;

          const controlProps = {
            className: 'dock__link',
            'aria-label': label,
            ref: (node) => registerItem(item.id, node),
            /* A hovered tile is an intent to open the window, so the ask goes out now
               and the click never waits on the network. */
            onPointerEnter: item.preload ? () => { item.preload(); } : undefined,
          };

          return (
            <div className="dock__item" key={item.id}>
              <Tooltip label={item.label} side="top">
                {item.kind === 'external' ? (
                  <a {...controlProps} href={item.href} {...externalLinkProps(item.href)}>
                    <AppIcon icon={icon} accent={item.accent} art={item.art} />
                  </a>
                ) : (
                  <button
                    {...controlProps}
                    type="button"
                    data-dock-id={item.kind === 'window' ? item.id : undefined}
                    aria-pressed={item.kind === 'window' ? running : undefined}
                    onClick={() => activate(item)}
                  >
                    <AppIcon icon={icon} accent={item.accent} art={item.art} />
                  </button>
                )}
              </Tooltip>
              {item.kind === 'window' ? (
                <span
                  className="dock__indicator"
                  data-state={
                    minimized ? 'minimized' : frontmostId === item.id ? 'front' : running ? 'open' : 'idle'
                  }
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}

        {/* No tray of minimised tiles here. A second copy of every running app, in a
            row that grows as you minimise things, pushed the real icons sideways and
            duplicated a click the tile already answers; the dot under the tile says the
            same thing in 5px, in the place your hand already is. */}
      </div>
    </div>
  );
}

export default Dock;
