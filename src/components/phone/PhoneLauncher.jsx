import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Smartphone, X } from 'lucide-react';

import { PhoneDevice } from './PhoneDevice.jsx';
import { usePhoneGutter } from '../../hooks/useMediaQuery.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { useWindowManager } from '../../hooks/useWindowManager.jsx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The phone, mounted on the desktop.
 *
 * Two surfaces, one component: a small device floating in the left gutter as a
 * preview, and the same device at full size in a modal overlay. The preview is
 * only rendered when there is room for it *and* the desktop has reserved a
 * gutter for it (`--phone-space` in phone.css, driven by the same media query),
 * so at any narrower width the desktop loses nothing — there is no half-hidden
 * phone and no squeezed window row.
 *
 * It exists because the portfolio is also an iPhone on a phone: this is the same
 * data presented the way the other device does it, not a second app.
 */
export function PhoneLauncher() {
  const showInGutter = usePhoneGutter();
  const reducedMotion = usePrefersReducedMotion();
  const { openWindow } = useWindowManager();
  const [expanded, setExpanded] = useState(false);
  const slotRef = useRef(null);
  const overlayRef = useRef(null);
  const closeRef = useRef(null);
  const restoreRef = useRef(null);

  /* The preview settles into the gutter once, after the desktop has booted. */
  useEffect(() => {
    if (!showInGutter || reducedMotion || !slotRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.phone-slot__preview, .phone-slot__note', {
        yPercent: 9,
        autoAlpha: 0,
        scale: 0.97,
        duration: 0.7,
        stagger: 0.06,
        ease: 'back.out(1.4)',
        delay: 0.55,
      });
    }, slotRef);
    return () => ctx.revert();
  }, [showInGutter, reducedMotion]);

  /* Opening the phone pushes the device up from the preview's position. */
  useEffect(() => {
    if (!expanded || reducedMotion || !overlayRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.phone-overlay .phone-device', {
        yPercent: 14,
        autoAlpha: 0,
        scale: 0.94,
        duration: 0.45,
        ease: 'back.out(1.25)',
      });
    }, overlayRef);
    return () => ctx.revert();
  }, [expanded, reducedMotion]);

  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return undefined;
    restoreRef.current = document.activeElement;
    closeRef.current?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab' || !overlayRef.current) return;
      // A light focus trap: the dialog is modal, so Tab must not wander into
      // the desktop behind it.
      const items = [...overlayRef.current.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null || node === closeRef.current,
      );
      if (items.length < 2) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    /* A modal keeps focus inside itself. Tab is one half; the other half is that
       something *else* taking focus — a window finishing its open animation
       behind the scrim, say — is pulled straight back, instead of leaving the
       keyboard typing into a desktop the visitor cannot see. */
    const onFocusIn = (event) => {
      if (overlayRef.current?.contains(event.target)) return;
      if (document.activeElement === closeRef.current) return;
      closeRef.current?.focus?.();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.body.style.overflow = overflow;
      /* Focus goes back to the control that opened the dialog — but only now,
         after the trap is gone, because restoring it *during* the trap would get
         pulled straight back inside. `document.contains` guards the case where the
         launcher stopped rendering altogether while the phone was open. */
      const back = restoreRef.current;
      restoreRef.current = null;
      if (back && document.contains(back)) back.focus?.();
    };
  }, [expanded, close]);

  if (!showInGutter) return null;

  /* From inside the phone, "open this on the desktop" closes the device and
     raises the window it is summarising — the one honest way out. */
  const openDesktop = (id) => {
    setExpanded(false);
    openWindow(id, { origin: 'phone' });
  };

  return (
    <>
      <div className="phone-slot" ref={slotRef}>
        {/* The device is a picture of itself: `inert` inside, and no role on the
            wrapper, because a button may not contain the buttons the phone holds.
            Clicking it works; the caption below is the focusable way in. */}
        <div className="phone-slot__preview" onClick={() => setExpanded(true)}>
          <PhoneDevice interactive={false} />
        </div>
        <button
          type="button"
          className="phone-slot__note"
          aria-haspopup="dialog"
          aria-label="Open the phone preview"
          onClick={() => setExpanded(true)}
        >
          <Smartphone size={12} aria-hidden="true" />
          iPhone preview — tap to open
        </button>
      </div>

      {expanded ? (
        <div className="phone-overlay" role="dialog" aria-modal="true" aria-label="Phone preview" ref={overlayRef}>
          <button type="button" className="phone-overlay__scrim" tabIndex={-1} onClick={close} aria-hidden="true" />
          <button type="button" className="phone-overlay__close" onClick={close} ref={closeRef}>
            <X size={13} aria-hidden="true" />
            Close
          </button>
          <div className="phone-overlay__stage">
            <PhoneDevice interactive onOpenDesktop={openDesktop} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** The deferred gutter device is bound by `lazy()` in Desktop.jsx, which takes the
 * module's default export — the same contract every window in the registry keeps. */
export default PhoneLauncher;
