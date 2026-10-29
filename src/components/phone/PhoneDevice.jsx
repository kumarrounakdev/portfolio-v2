import { useState } from 'react';

import { PhoneAppRouter } from './apps.jsx';
import { PhoneHomeScreen } from './PhoneHomeScreen.jsx';
import { PhoneLockScreen } from './PhoneLockScreen.jsx';
import { PhoneStatusBar } from './PhoneStatusBar.jsx';

/**
 * The device itself: frame, island, status bar, one screen at a time, and the
 * home indicator.
 *
 * It takes no sizing props on purpose. The mini preview in the desktop gutter
 * and the full device in the overlay are the *same* component at two
 * `font-size`s — every measurement inside is an `em` — so the preview cannot
 * drift into a cartoon of the real thing.
 *
 * `interactive={false}` renders the whole device `inert`: the floating preview
 * then shows a working clock behind one button instead of hiding four
 * unfocusable controls inside it.
 */
export function PhoneDevice({ interactive = true, onOpenDesktop }) {
  const [unlocked, setUnlocked] = useState(false);
  // `null` is the home screen; anything else is { app, id?, backTo? }.
  const [screen, setScreen] = useState(null);

  const go = (next) => setScreen(next);
  const goHome = () => setScreen(null);
  const goDesktop = (id) => {
    if (!interactive) return;
    onOpenDesktop?.(id ?? 'home');
  };

  const open = (next) => {
    if (!interactive) return;
    setScreen(next);
  };

  const canGoHome = interactive && Boolean(screen);

  return (
    <div className="phone-device" {...(interactive ? {} : { inert: true, 'aria-hidden': 'true' })}>
      <span className="phone-device__edge" aria-hidden="true" />
      <span className="phone-island" aria-hidden="true">
        <span className="phone-island__lens" />
      </span>

      <div className={`phone-screen${unlocked ? '' : ' phone-screen--lock'}`}>
        <PhoneStatusBar />

        <div className="phone-stack">
          {!unlocked ? (
            <PhoneLockScreen onUnlock={interactive ? () => setUnlocked(true) : undefined} />
          ) : screen === null ? (
            <PhoneHomeScreen onOpen={open} onOpenDesktop={goDesktop} />
          ) : (
            <PhoneAppRouter
              key={`${screen.app}${screen.id ? `-${screen.id}` : ''}`}
              screen={screen}
              go={open}
              onHome={goHome}
              onOpenDesktop={goDesktop}
            />
          )}
        </div>

        {/* iOS's home indicator is an affordance with a job, so it has one: leave
            the app. On the lock screen and the home screen there is nowhere to
            go, and the bar says so by going quiet rather than doing nothing. */}
        <div className="phone-homebar">
          <button
            type="button"
            className="phone-homebar__button"
            onClick={goHome}
            disabled={!canGoHome}
            aria-label={canGoHome ? 'Go to the phone home screen' : 'Home'}
            title={canGoHome ? 'Back to the phone home screen' : 'You are already on a top-level screen'}
          >
            <span className="phone-homebar__bar" />
          </button>
        </div>
      </div>
    </div>
  );
}
