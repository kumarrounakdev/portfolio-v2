import { useRef, useState } from 'react';
import { ArrowUp, Camera, Flashlight, FlashlightOff, Link } from 'lucide-react';

import { SystemWidget, WelcomeWidget } from '../widgets.jsx';
import { useClock } from '../../hooks/useClock.js';
import { useTheme } from '../../hooks/useTheme.jsx';
import { useWindowManager } from '../../hooks/useWindowManager.jsx';
import { profile } from '../../data/portfolio.js';
import { copyText, isSet } from '../../utils/links.js';

/**
 * The lock screen: what a phone shows first, so it earns the same place here —
 * real clock, real date, and the two live widgets you can reach without
 * unlocking.
 *
 * iOS puts a torch and a camera in the two round buttons. A browser has
 * neither, so they do the nearest real thing: the torch switches the
 * light/dark appearance (the same key System Settings writes) and the camera
 * copies the link to this page. A glyph that leads nowhere would turn the whole
 * device into a prop.
 */
export function PhoneLockScreen({ onUnlock }) {
  const clock = useClock();
  const { theme, setPreference } = useTheme();
  const { announce } = useWindowManager();
  const [copied, setCopied] = useState(false);
  const dragFrom = useRef(null);

  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(clock.raw);

  /* A swipe up unlocks, and the button under it is the same action for a
     keyboard, a tap that stops short, or anyone who would rather click. */
  const onPointerDown = (event) => {
    dragFrom.current = event.clientY;
  };

  const onPointerUp = (event) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (typeof from === 'number' && from - event.clientY > 24) onUnlock();
  };

  const copyLink = async () => {
    const ok = await copyText(globalThis.location?.href ?? '');
    setCopied(ok);
    announce(
      ok
        ? 'Link copied to the clipboard'
        : 'This browser blocked the clipboard — copy the address from the bar instead',
    );
    if (ok) globalThis.setTimeout?.(() => setCopied(false), 1800);
  };

  const availability = isSet(profile.availability?.label) ? profile.availability.label : null;

  return (
    <section className="phone-lock" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {/* The device draws the status bar; the lock screen only recolours it. */}
      <p className="phone-lock__date">{date}</p>
      <p className="phone-lock__clock">{clock.time}</p>

      <div className="phone-lock__widgets phone-widgets">
        <WelcomeWidget />
        <SystemWidget />
      </div>

      <div className="phone-lock__actions">
        <button
          type="button"
          className={`phone-lock__action${theme === 'light' ? ' phone-lock__action--on' : ''}`}
          onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to the light appearance' : 'Switch to the dark appearance'}
          aria-label={
            theme === 'dark'
              ? 'Turn the torch on: switch this site to its light appearance'
              : 'Turn the torch off: switch this site to its dark appearance'
          }
        >
          {theme === 'dark' ? <Flashlight size={15} /> : <FlashlightOff size={15} />}
        </button>

        <button
          type="button"
          className="phone-lock__action"
          onClick={copyLink}
          title="Copy the link to this page"
          aria-label={copied ? 'Link copied' : 'Copy the link to this page'}
        >
          {copied ? <Link size={15} /> : <Camera size={15} />}
        </button>
      </div>

      <button type="button" className="phone-lock__swipe" onClick={onUnlock}>
        <ArrowUp size={13} strokeWidth={2.2} aria-hidden="true" />
        Swipe up to open
      </button>

      <p className="phone-lock__note">
        {availability ? `${availability} · ` : ''}everything inside is the same data as the desktop
      </p>
    </section>
  );
}
