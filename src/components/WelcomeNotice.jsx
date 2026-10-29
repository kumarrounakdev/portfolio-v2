import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Sparkles, X } from 'lucide-react';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { profile } from '../data/portfolio.js';

const DISMISSED_KEY = 'portfolio.welcome-dismissed';

/**
 * A one-time, dismissible note that explains the desktop metaphor. It shows at
 * most once per browser session, never blocks a window, and is skipped entirely
 * for visitors who asked for reduced motion or already dismissed it.
 */
export function WelcomeNotice() {
  const { openWindow } = useWindowManager();
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch (error) {
      dismissed = false;
    }
    if (dismissed) return undefined;
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const node = ref.current;
    if (!node || reducedMotion) return undefined;
    const enter = gsap.fromTo(node, { autoAlpha: 0, y: -12, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' });
    const dismiss = window.setTimeout(() => hide(), 11000);
    return () => {
      enter.kill();
      window.clearTimeout(dismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  const hide = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch (error) {
      /* private mode: it simply shows again next visit */
    }
    const node = ref.current;
    if (node && !reducedMotion) {
      gsap.to(node, {
        autoAlpha: 0,
        y: -8,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setVisible(false),
      });
      return;
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="notice" ref={ref} role="note" aria-label="Welcome">
      <span className="notice__icon" aria-hidden="true">
        <Sparkles size={15} />
      </span>
      <div className="notice__body">
        <p className="notice__title">{profile.name}’s portfolio</p>
        <p className="notice__text">
          Each section is a window — open them from the Dock, the menu bar or the buttons below, or
          press ⌘K (Ctrl-K) to jump straight to one. Drag a title bar to move a window; the three
          lights close, minimise and zoom it.
        </p>
      </div>
      <button type="button" className="notice__dismiss" onClick={hide} aria-label="Dismiss welcome message">
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

export default WelcomeNotice;
