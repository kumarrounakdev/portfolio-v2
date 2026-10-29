import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { useIsCompact } from '../hooks/useMediaQuery.js';
import { Tooltip } from './Tooltip.jsx';
import { TrafficGlyph } from './icons.jsx';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Reusable macOS-style window chrome. It owns:
 *   - the title bar, traffic lights and stacking (z-index from the manager)
 *   - pointer dragging, bounded to the desktop area, disabled when zoomed/compact
 *   - the GSAP transitions that visualise the manager's transitional statuses
 *   - focus handoff when a window opens and when it closes
 *
 * Children render inside `.window__body`, which is a flex column: each window
 * draws its own toolbar row (Finder) or status footer there, so this chrome
 * stays identical everywhere instead of forking per application.
 */
export function WindowFrame({ definition, children }) {
  const {
    windows,
    frontmostId,
    zIndexById,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    settleWindow,
  } = useWindowManager();

  const state = windows[definition.id];
  const reducedMotion = usePrefersReducedMotion();
  const isCompact = useIsCompact();

  const rootRef = useRef(null);
  const surfaceRef = useRef(null);
  const dragRef = useRef(null);
  const lastStatus = useRef(null);
  const [dragging, setDragging] = useState(false);

  const isOpen = Boolean(state?.open);
  const isRendered = isOpen && !state?.minimized;
  const isFront = frontmostId === definition.id;
  const canDrag = !isCompact && !state?.maximized && definition.draggable !== false;

  /* ------------------------------------------------------- animation ---- */
  useLayoutEffect(() => {
    if (!state) return undefined;
    const status = state.status;
    if (status === lastStatus.current) return undefined;
    lastStatus.current = status;

    const element = surfaceRef.current;
    const settleTo = { opening: 'open', restoring: 'open', zooming: 'open', minimizing: 'minimized', closing: 'closed' }[status];

    if (!element || reducedMotion) {
      if (settleTo) settleWindow(definition.id, settleTo);
      return undefined;
    }

    // A window can be interrupted mid-flight; drop any tween still on it first.
    gsap.killTweensOf(element);

    const timeline = gsap.timeline({
      onComplete: () => {
        if (settleTo) settleWindow(definition.id, settleTo);
      },
    });

    if (status === 'opening') {
      // A Mac window grows into place from 0.94; an iPhone app is already the
      // screen, so it lands by easing down from just over full size instead.
      timeline.fromTo(
        element,
        isCompact
          ? { autoAlpha: 0, scale: 1.045, y: 0, transformOrigin: '50% 50%' }
          : { autoAlpha: 0, scale: 0.94, y: 18, transformOrigin: '50% 55%' },
        { autoAlpha: 1, scale: 1, y: 0, duration: isCompact ? 0.34 : 0.38, ease: isCompact ? 'power2.out' : 'power3.out' },
      );
    } else if (status === 'closing') {
      timeline.to(
        element,
        isCompact
          ? { autoAlpha: 0, scale: 0.96, y: 0, duration: 0.2, ease: 'power2.in', transformOrigin: '50% 50%' }
          : { autoAlpha: 0, scale: 0.965, y: 10, duration: 0.2, ease: 'power2.in', transformOrigin: '50% 55%' },
      );
    } else if (status === 'minimizing') {
      const rect = element.getBoundingClientRect();
      const travel = Math.max(60, window.innerHeight - rect.top - 40);
      timeline.to(element, {
        autoAlpha: 0,
        scale: 0.5,
        y: travel * 0.55,
        duration: 0.3,
        ease: 'power2.in',
        transformOrigin: '50% 100%',
      });
    } else if (status === 'restoring') {
      timeline.fromTo(
        element,
        { autoAlpha: 0, scale: 0.62, y: 70, transformOrigin: '50% 100%' },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.36, ease: 'power3.out' },
      );
    } else if (status === 'zooming') {
      // Layout changes instantly; the tween only softens the jump.
      timeline.fromTo(element, { scale: 0.986, autoAlpha: 0.86 }, { scale: 1, autoAlpha: 1, duration: 0.24, ease: 'power2.out' });
    }

    return () => {
      timeline.kill();
      if (surfaceRef.current) {
        gsap.set(surfaceRef.current, { clearProps: 'transform,opacity,visibility' });
      }
    };
  }, [state?.status, reducedMotion, isCompact, definition.id, settleWindow]);

  /* ------------------------------------------------- focus management --- */
  useEffect(() => {
    if (state?.status !== 'open' || state.minimized) return;
    // Only take focus for windows the visitor opened deliberately. The home
    // window opens automatically on load and must not steal the first Tab.
    if (!state.origin || state.origin === 'auto') return;
    surfaceRef.current?.focus({ preventScroll: true });
  }, [state?.status, state?.minimized, state?.origin]);

  /* When a window leaves the screen, focus must not be dropped to <body>.
     This runs on the *start* of the transition, because once the manager settles
     to 'closed' the frame is unmounted with the window list and no effect of its
     own can observe that anymore. */
  useEffect(() => {
    if (state?.status !== 'closing' && state?.status !== 'minimizing') return;
    const dockItem = document.querySelector(`[data-dock-id="${definition.id}"]`);
    if (dockItem instanceof HTMLElement) dockItem.focus({ preventScroll: true });
  }, [state?.status, definition.id]);

  /* ------------------------------------------------------ keep in view --- */
  const clampPosition = useCallback(
    (nextX, nextY) => {
      const host = rootRef.current?.parentElement;
      const element = rootRef.current;
      if (!host || !element) return { x: nextX, y: nextY };
      const hostRect = host.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const spanX = Math.max(0, (hostRect.width - elementRect.width) / 2 - 8);
      const spanY = Math.max(0, (hostRect.height - elementRect.height) / 2 - 8);
      return {
        x: clamp(nextX, -spanX, spanX),
        // Never let the title bar leave the desktop: that is how windows get lost.
        y: clamp(nextY, -spanY, Math.max(0, spanY - 8)),
      };
    },
    [],
  );

  useEffect(() => {
    if (isCompact || !isRendered || state?.maximized) return undefined;
    const onResize = () => {
      const clamped = clampPosition(state.x, state.y);
      if (Math.abs(clamped.x - state.x) > 0.5 || Math.abs(clamped.y - state.y) > 0.5) {
        moveWindow(definition.id, clamped.x, clamped.y);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isCompact, isRendered, state?.maximized, state?.x, state?.y, definition.id, clampPosition, moveWindow]);

  /* ---------------------------------------------------------- dragging -- */
  const onPointerDown = (event) => {
    if (!canDrag || event.button !== 0) return;
    if (event.target.closest('button, a, input, textarea, select, [role="menu"]')) return;
    const element = rootRef.current;
    if (!element) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: state.x,
      originY: state.y,
    };
    setDragging(true);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    const element = rootRef.current;
    if (!drag || !element || drag.pointerId !== event.pointerId) return;
    const next = clampPosition(drag.originX + (event.clientX - drag.startX), drag.originY + (event.clientY - drag.startY));
    // Transform-only updates during the drag; React state is committed on release.
    element.style.setProperty('--x', `${next.x}px`);
    element.style.setProperty('--y', `${next.y}px`);
    drag.next = next;
  };

  const endDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag.next) moveWindow(definition.id, drag.next.x, drag.next.y);
  };

  /* ------------------------------------------------------------ render -- */
  if (!state || !isRendered) return null;

  const style = {
    '--w': `${definition.size.w}px`,
    '--h': `${definition.size.h}px`,
    '--x': `${state.x}px`,
    '--y': `${state.y}px`,
    '--z': 10 + (zIndexById?.[definition.id] ?? 1),
  };

  return (
    <section
      ref={rootRef}
      className={`window window--${definition.id}`}
      data-fit={definition.size.fit ? 'true' : 'false'}
      data-maximized={state.maximized ? 'true' : 'false'}
      data-focused={isFront ? 'true' : 'false'}
      data-draggable={canDrag ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
      style={style}
      onPointerDown={() => {
        if (!isFront) focusWindow(definition.id);
      }}
    >
      <div
        className="window__surface"
        ref={surfaceRef}
        role="dialog"
        aria-modal="false"
        aria-label={`${definition.title} window`}
        tabIndex={-1}
      >
        <header
          className="window__titlebar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => {
            if (!isCompact) toggleMaximize(definition.id);
          }}
        >
          <div className="window__lights">
            <Tooltip side="bottom" label="Close">
              <button
                type="button"
                className="light light--close"
                aria-label={`Close ${definition.title} window`}
                onClick={() => closeWindow(definition.id)}
              >
                <TrafficGlyph type="close" />
              </button>
            </Tooltip>
            <Tooltip side="bottom" label="Minimise">
              <button
                type="button"
                className="light light--minimize"
                aria-label={`Minimise ${definition.title} window to the Dock`}
                onClick={() => minimizeWindow(definition.id)}
              >
                <TrafficGlyph type="minimize" />
              </button>
            </Tooltip>
            {isCompact ? null : (
              <Tooltip side="bottom" label={state.maximized ? 'Restore' : 'Zoom'}>
                <button
                  type="button"
                  className="light light--zoom"
                  aria-label={state.maximized ? `Restore ${definition.title} window size` : `Zoom ${definition.title} window`}
                  aria-pressed={state.maximized}
                  onClick={() => toggleMaximize(definition.id)}
                >
                  <TrafficGlyph type="zoom" />
                </button>
              </Tooltip>
            )}
          </div>

          <h2 className="window__title">
            <span>{definition.title}</span>
            {definition.caption ? <span className="window__title-caption">— {definition.caption}</span> : null}
          </h2>

        </header>

        <div className="window__body">{children}</div>

      </div>
    </section>
  );
}

export default WindowFrame;
